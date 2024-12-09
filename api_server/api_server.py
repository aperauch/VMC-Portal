# To Activate venv:  source ./bin/activate
import active_directory_users
import logging
import random
import time
import yaml #python -m pip install pyyaml
import io
import subprocess
import requests
import jwt
import boto3 #python -m pip install boto3
from botocore.exceptions import ClientError
from jwt import PyJWKClient
from functools import wraps
from cryptography.hazmat.primitives import serialization
from subprocess import check_output, DEVNULL
from zipfile import ZipFile
from io import BytesIO
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from ns1 import NS1, Config  #python -m pip install ns1-python
from ns1.rest.errors import ResourceException, RateLimitException, AuthException
from flask import Flask, json, g, request, make_response, jsonify, send_file, send_from_directory
from flask.logging import create_logger
from flask_cors import CORS, cross_origin
from datetime import datetime, timedelta
from vmware.vapi.vmc.client import create_vmc_client  #python -m pip install --upgrade git+https://github.com/vmware/vsphere-automation-sdk-python.git
from com.vmware.nsx_vmc_app_client_for_vmc import create_nsx_vmc_app_client_for_vmc
from com.vmware.nsx_policy_client_for_vmc import create_nsx_policy_client_for_vmc
from com.vmware.nsx_vmc_app.model_client import PublicIp
from com.vmware.nsx_policy.model_client import PolicyNatRule
from vmware.vapi.bindings.struct import PrettyPrinter as NsxPrettyPrinter
from com.vmware.nsx_policy.model_client import ApiError
from wavefront_pyformance import tagged_registry
from wavefront_pyformance import wavefront_reporter

# Import config settings from yaml file
yaml_file = open('config.yaml', 'r')
yaml_dict = yaml.load(yaml_file, Loader=yaml.FullLoader)

# Logging Settings
log_format = ('[%(asctime)s] %(levelname)-8s %(name)-12s %(message)s')
logging.basicConfig(
    filename=yaml_dict['LogFilepath'],
    level=logging.DEBUG,
    format=log_format
)

# Flask app config settings
app = Flask(__name__)
app.config['CORS_HEADERS'] = 'Content-Type'
CORS(app)
#CORS(app, resources={r"/*": {"origins": "*"}})
#logging.getLogger('flask_cors').level = logging.DEBUG

# LDAP
LDAP_CONNECTION_STRING = yaml_dict['LdapConnectionString']
LDAP_PROTOCOL_VERSION = yaml_dict['LdapProtocolVersion']

# NS1 DNS config settings
API_KEY_VALUE = yaml_dict['DnsApiKey']
EUCLABNET_ZONE_NAME = yaml_dict['DnsZones'][0]
PSOLABNET_ZONE_NAME = yaml_dict['DnsZones'][1]
config = Config()
config.createFromAPIKey(API_KEY_VALUE)
api = NS1(config=config)

# VMC
VMC_CSP_REFRESH_TOKEN = yaml_dict['VmcCspRefreshToken']
VMC_CSP_AUTH_URL = yaml_dict['VmcCspAuthUrl'] + \
    "?refresh_token=" + VMC_CSP_REFRESH_TOKEN
VMC_ORG = yaml_dict['VmcOrg']
VMC_ORG_ID = yaml_dict['VmcOrgId']
VMC_SDDC = yaml_dict['VmcSddc']
VMC_SDDC_ID = yaml_dict['VmcSddcId']
NSX_VMC_AWS_API_BASE_URL = yaml_dict['NsxVmxAwsApiBaseUrl']

# format NSXT objects for readability
nsx_pp = NsxPrettyPrinter()

# Wavefront Pyformance Metrics
#reg = tagged_registry.TaggedRegistry()
#c1 = reg.counter("numbers")
#c1.inc()

#host = "localhost"

# report metrics to a Wavefront proxy every 10s
#wf_proxy_reporter = wavefront_reporter.WavefrontProxyReporter(
#    host=host, port=2878, registry=reg,
#    source='vmc-c-portal01',
#    tags={'key1': 'val1', 'key2': 'val2'},
#    prefix='python.proxy.',
#    reporting_interval=10,
#    enable_runtime_metrics=True)
#wf_proxy_reporter.report_now()

def respond_with_exception(exception, message, status_code):
    _ex = str(exception)
    logging.error(_ex)
    response = make_response({ "Error": _ex, "Message": message }, status_code)
    response.headers["Content-Type"] = "application/json"
    return response

# HTTP Error Handlers
@app.errorhandler(401)
def handle_user_not_authorized(exception):
    return respond_with_exception(exception, "401 Unauthorized", 401)
app.register_error_handler(401, handle_user_not_authorized)

# HTTP Custom Wrappers/Decorators
def require_verified_jwt_token(func):
    def _verify_token(*args, **kwargs):
        try:
            token = request.environ['HTTP_AUTHORIZATION']
            token = token.replace("Bearer ", "")
            jwks_client = PyJWKClient('https://login.microsoftonline.com/common/discovery/v2.0/keys')
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            token_data = jwt.decode(jwt=token, key=signing_key.key, algorithms=['RS256'], audience="77835cdc-2dfc-4d0e-ac71-21940dda40f6")
            if (token_data):
                return func(*args, **kwargs)
            else:
                return_data = { "Error": "Invalid Token" }
                return app.response_class(response=json.dumps(return_data), mimetype='application/json'), 401
        except Exception as ex:
            logging.error(str(ex))
            return_data = { "Error": str(ex) }
            return app.response_class(response=json.dumps(return_data), mimetype='application/json'), 401
    _verify_token.__name__ = func.__name__        
    return _verify_token

# API Routes
@app.route("/")
@app.route("/health")
def health_check():
    try:
        localtime = time.asctime(time.localtime(time.time()))
        logging.info("Server is running.")
        return {"Status": "Running", "DateTime": localtime}
    except Exception as ex:
        return respond_with_exception(ex, "Unknown exception occurred", 500)


@app.route("/dns", methods=["GET"])
@require_verified_jwt_token
def get_dns_records():
    try:
        psolabnet_zone = api.loadZone(PSOLABNET_ZONE_NAME)
        euclabnet_zone = api.loadZone(EUCLABNET_ZONE_NAME)

        all_zone_records = {
            psolabnet_zone.zone: psolabnet_zone.data["records"],
            euclabnet_zone.zone: euclabnet_zone.data["records"]
        }
        all_zone_records_json = json.dumps(all_zone_records)

        response = make_response(all_zone_records_json, 200)
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        return respond_with_exception(ex, "An exception occurred when getting DNS records.", 500)


@app.route("/dns", methods=["PUT"])
@require_verified_jwt_token
def create_dns_record():
    data = request.get_json()
    logging.info("Creating DNS record " + data['zone'])
    zone = api.loadZone(data['zone'])
    response = make_response({"message": "No action was taken."}, 500)

    try:
        ns1Record = None
        if data['type'] == 'TXT':
            ns1Record = zone.add_TXT(data['domain'], data['answers'])
        elif data['type'] == 'A':
            ns1Record = zone.add_A(data['domain'], data['answers'])
        elif data['type'] == 'AAAA':
            ns1Record = zone.add_AAAA(data['domain'], data['answers'])
        elif data['type'] == 'CNAME':
            ns1Record = zone.add_CNAME(data['domain'], data['answers'])
        elif data['type'] == 'MX':
            mx_answer = data['answers'].strip().split(" ")
            priority = int(mx_answer[0])
            value = mx_answer[1]
            ns1Record = zone.add_MX(data['domain'], [[priority, value]])
        elif data['type'] == 'SRV':
            srv_answer = data['answers'].strip().split(" ")
            priority = int(srv_answer[0])
            weight = int(srv_answer[1])
            port = int(srv_answer[2])
            value = srv_answer[3]
            ns1Record = zone.add_SRV(data['domain'], [[priority, weight, port, value]])
        else:
            return make_response("Unknown DNS record type.", 400)
            
        json = jsonify(ns1Record.data)
        response = make_response(ns1Record.data, json.status_code)
        response.headers["Content-Type"] = "application/json"
        return response
    except ResourceException as re:
        return respond_with_exception(re, re.response.text, re.response.status_code)
    except Exception as ex:
        return respond_with_exception(ex, "An error occurred when trying to create a DNS record.", 500)

@app.route("/dns", methods=["POST"])
@require_verified_jwt_token
def update_dns_record():
    data = request.get_json()
    zone = api.loadZone(data['zone'])
    rec = zone.loadRecord(data['domain'], data['type'])

    # Modify the record with the new values
    logging.info("Updating DNS record: " + rec.domain)

    response = make_response({"message": "No action was taken."}, 500)

    try:
        ns1Record = rec.update(answers=[data['answers']])
        json = jsonify(ns1Record.data)
        response = make_response(ns1Record.data, json.status_code)
        response.headers["Content-Type"] = "application/json"
        return response
    except ResourceException as re:
        return respond_with_exception(re, re.response.text, re.response.status_code)
    except Exception as ex:
        return respond_with_exception(ex, "An error occurred when updating a DNS record.", 500)


@app.route("/dns/delete", methods=["POST"])
@require_verified_jwt_token
def delete_dns_record():
    response = make_response({"message": "No action was taken."}, 500)

    try:
        data = request.get_json()
        zone = api.loadZone(data['zone'])
        rec = zone.loadRecord(data['domain'], data['type'])
        response = rec.delete()

        if response:
            error_message = "Something unexpected occurred when deleting " + rec.domain
            response = make_response(jsonify({"message": error_message}), 500)
        else:
            print("Deleted " + rec.domain + " successfully.")
            response = make_response(
                jsonify({"message": "Deleted " + rec.domain + " successfully."}))
        response.headers["Content-Type"] = "application/json"
        return response
    except ResourceException as re:
        return respond_with_exception(re, re.response.text, re.response.status_code)
    except Exception as ex:
        return respond_with_exception(ex, "An error occurred when deleting a DNS record.", 500)


@app.route("/publicips", methods=["GET"])
@require_verified_jwt_token
def get_vmc_public_ips():
    logging.info("Getting all public IP reservations.")
    response = make_response({"message": "No action was taken."}, 500)

    try:
        nsx_vmc_client = create_nsx_vmc_app_client_for_vmc(
            VMC_CSP_REFRESH_TOKEN, VMC_ORG_ID, VMC_SDDC_ID)
        response = make_response(
            nsx_vmc_client.infra.PublicIps.list().to_json(), 200)

        logging.info("Returning public IP info JSON: " + str(nsx_vmc_client.infra.PublicIps.list().to_json()))
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        log_error(ex)
        return respond_with_exception(ex, "Something unexpected occurred when getting list of leased IP addresses.", 500)


@app.route("/publicips", methods=["POST"])
@require_verified_jwt_token
def request_new_vmc_public_ip():
    response = make_response({"message": "No action was taken."}, 500)

    try:
        nsx_vmc_client = create_nsx_vmc_app_client_for_vmc(
            VMC_CSP_REFRESH_TOKEN, VMC_ORG_ID, VMC_SDDC_ID)

        data = request.get_json()
        public_ip = PublicIp(display_name=data['display_name'])

        response = make_response(nsx_vmc_client.infra.PublicIps.update(
            data['display_name'], public_ip).to_json(), 200)
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        error_message = "Something unexpected occurred when requesting IP " + data['display_name']
        return respond_with_exception(ex, error_message, 500)


@app.route("/publicips", methods=["PATCH"])
@require_verified_jwt_token
def update_vmc_public_ip():
    try:
        nsx_vmc_client = create_nsx_vmc_app_client_for_vmc(
            VMC_CSP_REFRESH_TOKEN, VMC_ORG_ID, VMC_SDDC_ID)

        data = request.get_json()
        public_ip = PublicIp(
            display_name=data['display_name'], ip=data['ip'], id=data['id'])

        response = make_response(nsx_vmc_client.infra.PublicIps.update(
            data['display_name'], public_ip).to_json(), 200)
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        log_error(ex)
        return respond_with_exception(ex, "Something unexpected occurred when updating a leased IP address.", 500)


@app.route("/publicips", methods=["PUT"])
@require_verified_jwt_token
def delete_new_vmc_public_ip():
    logging.info("Releasing public IP.")
    response = make_response({"message": "No action was taken."}, 500)

    try:
        data = request.get_json()
        logging.info("Release public IP request JSON: " + str(data))
        # Ensure IP is not being used in a NAT Rule before attempting delete
        nsx_policy_client = create_nsx_policy_client_for_vmc(
            VMC_CSP_REFRESH_TOKEN, VMC_ORG_ID, VMC_SDDC_ID)
        nat = nsx_policy_client.infra.tier_1s.nat.NatRules.list('cgw', 'USER')
        logging.info("Received NAT Rules results: " + str(nat.results))
        for nat_rule in nat.results:
            if nat_rule.translated_network == data['ip']:
                response = make_response({"message": "The IP is being used by NAT rule " +
                                          nat_rule.display_name + ".  Delete NAT rule before continuing."}, 409)
                response.headers["Content-Type"] = "application/json"
                return response

        # Proceed to delete
        nsx_vmc_client = create_nsx_vmc_app_client_for_vmc(
            VMC_CSP_REFRESH_TOKEN, VMC_ORG_ID, VMC_SDDC_ID)
        release_result = nsx_vmc_client.infra.PublicIps.delete(
            data['id'])  # None value returned on successful delete
        
        if release_result is None:
            logging.info("Successfully released public IP " + data['display_name'] + ".  NSX API Result: " + str(release_result))
        else:
            logging.info("Failed to release public IP " + data['display_name'] + ".  NSX API Result: " + str(release_result))

        response = make_response()
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        log_error(ex)
        error_message = "Something unexpected occurred when releasing IP " + data['ip']
        return respond_with_exception(ex, error_message, 500)


@app.route("/natrules", methods=['GET'])
@require_verified_jwt_token
def get_nat_rules():
    response = make_response({"message": "No action was taken."}, 500)

    try:
        nsx_policy_client = create_nsx_policy_client_for_vmc(
            VMC_CSP_REFRESH_TOKEN, VMC_ORG_ID, VMC_SDDC_ID)
        nat = nsx_policy_client.infra.tier_1s.nat.NatRules.list('cgw', 'USER')
        response = make_response(nat.to_json(), 200)
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        log_error(ex)
        return respond_with_exception(ex, "Something unexpected occurred when getting NAT rules.", 500)


@app.route("/natrules", methods=['POST'])
@require_verified_jwt_token
def create_nat_rule():
    data = request.get_json()
    response = make_response({"message": "No action was taken."}, 500)

    try:
        nat_obj = PolicyNatRule(action='REFLEXIVE',
                                scope=['/infra/labels/cgw-public'],
                                source_network=data['source_network'],
                                translated_network=data['translated_network'],
                                display_name=data['display_name'],
                                sequence_number=1,
                                firewall_match='MATCH_INTERNAL_ADDRESS')

        # patch() method is void
        nsx_policy_client = create_nsx_policy_client_for_vmc(
            VMC_CSP_REFRESH_TOKEN, VMC_ORG_ID, VMC_SDDC_ID)
        nsx_policy_client.infra.tier_1s.nat.NatRules.patch(
            'cgw', 'USER', data['display_name'], nat_obj)
        response = make_response(nat_obj.to_json(), 200)
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        log_error(ex)
        error_message = "Something unexpected occurred when creating NAT rule " + data['display_name']
        return respond_with_exception(ex, error_message, 500)


@app.route("/natrules", methods=['PUT'])
@require_verified_jwt_token
def delete_nat_rule():
    data = request.get_json()
    response = make_response({"message": "No action was taken."}, 500)

    try:
        nsx_policy_client = create_nsx_policy_client_for_vmc(
            VMC_CSP_REFRESH_TOKEN, VMC_ORG_ID, VMC_SDDC_ID)
        nsx_policy_client.infra.tier_1s.nat.NatRules.delete(
            'cgw', 'USER', data['id'])
        response = make_response(
            {"message": "Successfully deleted NAT rule " + data['display_name']}, 200)
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        log_error(ex)
        error_message = "Something unexpected occurred when deleting NAT rule " + data['id']
        return respond_with_exception(ex, error_message, 500)


@app.route("/cgwrules", methods=['GET'])
@require_verified_jwt_token
def get_cgw_rules():
    response = make_response({"message": "No action was taken."}, 500)

    try:
        nsx_policy_client = create_nsx_policy_client_for_vmc(
            VMC_CSP_REFRESH_TOKEN, VMC_ORG_ID, VMC_SDDC_ID)
        cgw_object = nsx_policy_client.infra.domains.GatewayPolicies.get(
            'cgw', 'default')

        security_groups = nsx_policy_client.infra.domains.Groups.list(
            'cgw').results
        services = nsx_policy_client.infra.Services.list()

        # Replace destination group ID, source group ID, and service ID with display name
        for cgw in cgw_object.rules:

            new_dest_list = []
            for dest_group in cgw.destination_groups:
                if dest_group != 'ANY':
                    for sec_group in security_groups:
                        if sec_group.id == dest_group.split('/')[-1]:
                            new_dest_list.append(sec_group.display_name)

            if len(new_dest_list) > 0:
                cgw.destination_groups = new_dest_list

            new_source_list = []
            for source_group in cgw.source_groups:
                if source_group != 'ANY':
                    for sec_group in security_groups:
                        if sec_group.id == source_group.split('/')[-1]:
                            new_source_list.append(sec_group.display_name)

            if len(new_source_list) > 0:
                cgw.source_groups = new_source_list

            new_service_list = []
            for cgw_service in cgw.services:
                if cgw_service != 'ANY':
                    for service in services.results:
                        if service.id == cgw_service.split('/')[-1]:
                            new_service_list.append(service.display_name)

            if len(new_service_list) > 0:
                cgw.services = new_service_list

            new_scope_list = []
            for scope in cgw.scope:
                new_scope_list.append(scope.split('/')[-1])
            if len(new_scope_list) > 0:
                cgw.scope = new_scope_list

        response = make_response(cgw_object.to_json(), 200)
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        log_error(ex)
        error_message = "Something unexpected occurred when getting CGW rules."
        return respond_with_exception(ex, error_message, 500)


@app.route("/cgwrules", methods=['PUT'])
@require_verified_jwt_token
def delete_cgw_rule():
    data = request.get_json()
    response = make_response({"message": "No action was taken."}, 500)
    try:
        nsx_policy_client = create_nsx_policy_client_for_vmc(
            VMC_CSP_REFRESH_TOKEN, VMC_ORG_ID, VMC_SDDC_ID)
        nsx_policy_client.infra.domains.gateway_policies.Rules.delete(
            'cgw', 'default', data['display_name'])
        response = make_response(
            {"message": "Successfully deleted CGW rule " + data['display_name']}, 200)
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        log_error(ex)
        error_message = "Something unexpected occurred when deleting CGW rule " + data['display_name']
        return respond_with_exception(ex, error_message, 500)


@app.route("/certificates", methods=['GET'])
@require_verified_jwt_token
def get_certificate_with_certbot():
    response = make_response({"message": "No action was taken."}, 500)
    try:
        results = subprocess.check_output(
            ["certbot.exe", "certificates"], stdin=DEVNULL, stderr=DEVNULL)

        raw_string = results.decode("utf-8").replace("\n", "")
        lines = raw_string.splitlines()
        cert_names = []
        serial_numbers = []
        domain_names = []
        expiration_dates = []
        status_values = []
        for line in lines:
            line = line.strip()
            if "Certificate Name:" in line:
                name = line.split(": ")[1]
                cert_names.append(name)
            if "Serial Number:" in line:
                serial = line.split(": ")[1]
                serial_numbers.append(serial)
            if "Domains:" in line:
                domains = line.split(": ")[1]
                domains_csv_str = domains.replace(" ", ", ")
                domain_names.append(domains_csv_str)
            if "Expiry Date:" in line:
                temp = line.split(": ")[1]
                date = temp.split(" ")[0]
                expiration_dates.append(date)

                temp = line.split("(")[1]
                status = temp.replace(")", "")
                status_values.append(status)

        cert_objects = []
        for i in range(len(cert_names)):
            cert_object = {'name': '', 'serialNumber': '',
                           'domains': '', 'expiration': '', 'status': ''}
            cert_object['name'] = cert_names[i]
            cert_object['serialNumber'] = serial_numbers[i]
            cert_object['domains'] = domain_names[i]
            cert_object['expiration'] = expiration_dates[i]
            cert_object['status'] = status_values[i]
            cert_objects.append(cert_object)

        response = make_response(jsonify({"results": cert_objects}))
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        error_message = "Something unexpected occurred when getting existing certificates."
        return respond_with_exception(ex, error_message, 500)


@app.route("/certificates", methods=['POST'])
@require_verified_jwt_token
def create_certificate_with_certbot():
    nsone_ini = 'E:\\GitHub\\EUC-Lab-Portal-Python\\certbot-nsone\\nsone.ini'
    logging.info("NSONE.INI filename: " + nsone_ini)
    response = make_response({"message": "No action was taken."}, 500)

    try:
        data = request.get_json()

        if data['email']:
            email = data['email']
        else:
            email = "svcPortalCertbot@vmwarepso.org"

        unformatted_domains = data['domains'].replace(" ", "").split(",")
        for i in range(len(unformatted_domains)):
            unformatted_domains[i] += "." + data['zone']

        if len(unformatted_domains) == 1:
            formatted_domains_csv_str = unformatted_domains[0]
        else:
            formatted_domains_csv_str = ",".join(unformatted_domains)

        logging.info("Formatted_domains_csv_str:  " +
                     formatted_domains_csv_str)
        logging.info("Received certificate creation request: " + str(data))

        results = subprocess.check_output(["certbot.exe",
                                            "certonly",
                                            "--keep-until-expiring",
                                            "--debug",
                                            "--non-interactive",
                                            "--agree-tos",
                                            "--email", email,
                                            "--no-eff-email",
                                            "--dns-nsone",
                                            "--dns-nsone-credentials", nsone_ini,
                                            "--dns-nsone-propagation-seconds", data['secondsToWait'],
                                            "--rsa-key-size", data['privateKeySize'],
                                            "--cert-name", data['name'],
                                            "--domains", formatted_domains_csv_str],
                                            stdin=DEVNULL,
                                            stderr=DEVNULL)

        raw_string = results.decode("utf-8")
        logging.info("Raw String:  " + raw_string)
        if "Congratulations" in raw_string:
            source_folder = "C:\\Certbot\\live\\" + data['name'] + "\\"
            zipFilename = data['name'] + ".zip"

            fullchainFilename = data['name'] + "-fullchain.pem"
            fullchainFilepath = source_folder + "fullchain.pem"

            privateKeyFilename = data['name'] + "-privkey.pem"
            privateKeyFilepath = source_folder + "privkey.pem"

            pfxFilename = data['name'] + ".pfx"
            pfxFilepath = source_folder + pfxFilename

            # Create PFX from PEM files
            openssl_results = subprocess.check_output(["E:\\Utils\\openssl\\openssl-1.0.2u-x64_86-win64\\openssl.exe",
                                                       "pkcs12",
                                                       "-export",
                                                       "-in", fullchainFilepath,
                                                       "-inkey", privateKeyFilepath,
                                                       "-out", pfxFilepath,
                                                       "-passout", "pass:" + data['privateKeyPassword']],
                                                      stdin=DEVNULL,
                                                      stderr=DEVNULL)

            # Create zip archive
            data = io.BytesIO()
            with ZipFile(data, 'w') as zip_archive:
                zip_archive.write(fullchainFilepath, arcname=fullchainFilename)
                zip_archive.write(privateKeyFilepath,
                                  arcname=privateKeyFilename)
                zip_archive.write(pfxFilepath, arcname=pfxFilename)
            data.seek(0)

            return send_file(data, mimetype='application/zip', as_attachment=True, attachment_filename=zipFilename)
        elif "Certificate not yet due for renewal" in raw_string:
            response = make_response(
                {"message": "The certificate exists already and is not due for renewal.  Keeping the existing certificate.  Either create a new cert or force renew this one."}, 400)
            response.status = "400 BAD REQUEST - The certificate exists already and is not due for renewal.  Keeping the existing certificate.  Either create a new cert or force renew this one."
        else:
            response = make_response(
                {"message": "Received an unexpected response from certbot:  " + raw_string}, 500)
            response.status = "500 INTERNAL SERVER ERROR - Received an unexpected response from certbot:  " + raw_string
        
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        error_message = "Something unexpected occurred when creating a new certificates."
        return respond_with_exception(ex, error_message, 500)


@app.route("/certificates", methods=['PUT'])
@require_verified_jwt_token
def renew_single_cert_by_cert_name_with_certbot():
    response = make_response({"message": "No action was taken."}, 500)
    try:
        data = request.get_json()
        if data['forceRenewal']:
            results = subprocess.check_output(["certbot.exe",
                                               "renew",
                                               "--force-renewal",
                                               "--cert-name", data['name']],
                                              stdin=DEVNULL,
                                              stderr=DEVNULL)
        else:
            results = subprocess.check_output(["certbot.exe",
                                               "renew",
                                               "--cert-name", data['name']],
                                              stdin=DEVNULL,
                                              stderr=DEVNULL)

        raw_string = results.decode("utf-8")

        if "Congratulations" in raw_string:
            source_folder = "C:\\Certbot\\live\\" + data['name'] + "\\"
            zipFilename = data['name'] + ".zip"

            fullchainFilename = data['name'] + "-fullchain.pem"
            fullchainFilepath = "C:\\Certbot\\live\\" + \
                data['name'] + "\\fullchain.pem"

            privateKeyFilename = data['name'] + "-privkey.pem"
            privateKeyFilepath = "C:\\Certbot\\live\\" + \
                data['name'] + "\\privkey.pem"

            pfxFilename = data['name'] + ".pfx"
            pfxFilepath = "C:\\Certbot\\live\\" + \
                data['name'] + "\\" + pfxFilename

            # Create PFX from PEM files
            openssl_results = subprocess.check_output(["E:\\Utils\\openssl\\openssl-1.0.2u-x64_86-win64\\openssl.exe",
                                                       "pkcs12",
                                                       "-export",
                                                       "-in", fullchainFilepath,
                                                       "-inkey", privateKeyFilepath,
                                                       "-out", pfxFilepath,
                                                       "-passout", "pass:" + data['privateKeyPassword']],
                                                      stdin=DEVNULL,
                                                      stderr=DEVNULL)

            # Create zip archive
            data = io.BytesIO()
            with ZipFile(data, 'w') as zip_archive:
                zip_archive.write(fullchainFilepath, arcname=fullchainFilename)
                zip_archive.write(privateKeyFilepath,
                                  arcname=privateKeyFilename)
                zip_archive.write(pfxFilepath, arcname=pfxFilename)
            data.seek(0)

            return send_file(data, mimetype='application/zip', as_attachment=True, attachment_filename=zipFilename)
        elif "not due for renewal" in raw_string:
            response = make_response(
                {"message": "The certificate is not due for renewal.  Enable force renewal if trying again."}, 400)
            response.status = "400 BAD REQUEST - The certificate is not due for renewal.  Enable force renewal if trying again."
        else:
            response = make_response(
                {"message": "Received an unexpected response from certbot:  " + raw_string}, 500)
            response.status = "500 INTERNAL SERVER ERROR - Received an unexpected response from certbot:  " + raw_string
        
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        error_message = "Something unexpected occurred when getting existing certificates."
        return respond_with_exception(ex, error_message, 500)


@app.route("/certificates", methods=['PATCH'])
@require_verified_jwt_token
def revoke_cert_with_certbot():
    response = make_response({"message": "No action was taken."}, 500)
    data = request.get_json()

    try:
        results = subprocess.check_output(["certbot.exe",
                                           "revoke",
                                           "--cert-name", data['name'],
                                           "--no-delete-after-revoke"],
                                          stdin=DEVNULL,
                                          stderr=DEVNULL)

        raw_string = results.decode("utf-8")

        if "Congratulations" in raw_string:
            response = make_response(
                jsonify({"message": "Successfully revoked certificate " + data['name'] + "."}))
        else:
            response = make_response(
                {"message": "Received an unexpected response from certbot:  " + raw_string}, 500)
            response.status = "500 INTERNAL SERVER ERROR - Received an unexpected response from certbot:  " + raw_string
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        error_message = "Something unexpected occurred when revoking a certificate."
        return respond_with_exception(ex, error_message, 500)


@app.route("/certificates/delete", methods=['POST'])
@require_verified_jwt_token
def delete_cert_with_certbot():
    response = make_response({"message": "No action was taken."}, 500)
    data = request.get_json()

    try:
        results = subprocess.check_output(["certbot.exe",
                                           "delete",
                                           "--cert-name", data['name']],
                                          stdin=DEVNULL,
                                          stderr=DEVNULL)

        raw_string = results.decode("utf-8")

        if "Deleted" in raw_string:
            response = make_response(
                jsonify({"message": "Successfully deleted certificate " + data['name'] + "."}))
        else:
            response = make_response(
                {"message": "Received an unexpected response from certbot:  " + raw_string}, 500)
            response.status = "500 INTERNAL SERVER ERROR - Received an unexpected response from certbot:  " + raw_string
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as ex:
        error_message = "Something unexpected occurresd when deleting a certificate."
        return respond_with_exception(ex, error_message, 500)

@app.route("/accounts", methods=['GET'])
@require_verified_jwt_token
def get_user_accounts():
    username = request.args.get('username')
    
    try:
        userAccount = active_directory_users.find_ad_users(username)
        adminAccount = active_directory_users.find_ad_users(username + "_admin")

        if len(userAccount['entries']) == 1 & len(adminAccount['entries']) == 1:
            response = make_response(jsonify({"UserAccount": userAccount['entries'][0]['attributes'], "AdminAccount": adminAccount['entries'][0]['attributes']}))
            response.headers["Content-Type"] = "application/json"
            logging.info(response.response[0])
            return response
        elif len(userAccount['entries']) == 0 & len(adminAccount['entries']) == 0:
            response = make_response(jsonify({"UserAccount": None, "AdminAccount": None}))
            response.headers["Content-Type"] = "application/json"
            logging.info(response.response[0])
            return response
        elif len(userAccount['entries']) == 0 & len(adminAccount['entries']) == 1:
            response = make_response(jsonify({"UserAccount": None, "AdminAccount": adminAccount['entries'][0]['attributes']}))
            response.headers["Content-Type"] = "application/json"
            logging.info(response.response[0])
            return response
        elif len(userAccount['entries']) == 1 & len(adminAccount['entries']) == 0:
            response = make_response(jsonify({"UserAccount": userAccount['entries'][0]['attributes'], "AdminAccount": None}))
            response.headers["Content-Type"] = "application/json"
            logging.info(response.response[0])
            return response
        else:
            if len(userAccount['entries']) == 0:
                logging.info("User account not found")
            elif len(userAccount['entries']) > 1:
                logging.error("Multiple user accounts were found")
            else:
                logging.error("Unknown error occurred when searching for user account.")

            if len(adminAccount['entries']) == 0:
                logging.info("Admin account not found")
            elif len(adminAccount['entries']) > 1:
                logging.error("Multiple admin accounts were found")
            else:
                logging.error("Unknown error occurred when searching for admin account.")
            return "Not all accounts were found", 500

    except Exception as ex:
        error_message = "Something unexpected occurred searching for user accounts."
        return reset_password(ex, error_message, 500)

@app.route("/accounts", methods=['POST'])
@require_verified_jwt_token
def create_user_accounts():
    data = request.get_json()
    userPassword = generate_password()
    adminPassword = generate_password()

    try:
        userAccount = active_directory_users.create_ad_user(data['Username'], data['Firstname'], data['Lastname'], userPassword, 'user')
        adminAccount = active_directory_users.create_ad_user(data['Username'] + "_admin", data['Firstname'], data['Lastname'], adminPassword, 'admin')
        
        if isinstance(userAccount, str) & isinstance(adminAccount, str):
            response = make_response(userAccount + "," + adminAccount, 400)
            response.headers["Content-Type"] = "application/json"
            return response
        elif isinstance(userAccount, str):
            response = make_response(userAccount, 400)
            response.headers["Content-Type"] = "application/json"
            return response
        elif isinstance(adminAccount, str):
            response = make_response(adminAccount, 400)
            response.headers["Content-Type"] = "application/json"
            return response
        elif len(userAccount['entries']) == 1 & len(adminAccount['entries']) == 1:
            recipient_email = data['Username'] + '@vmware.com'
            domain = userAccount['entries'][0]['dn'].split(",")[-3].split("DC=")[1].upper()
            user_username = domain + '\\' + userAccount['entries'][0]['attributes']['sAMAccountName']
            admin_username = domain + '\\' + adminAccount['entries'][0]['attributes']['sAMAccountName']
            send_accounts_created_email(data['Firstname'], recipient_email, user_username, userPassword, admin_username, adminPassword)
            response = make_response(jsonify({"UserAccount": userAccount['entries'][0], "UserAccountUsername": user_username, "UserAccountPassword": userPassword, "AdminAccount": adminAccount['entries'][0], "AdminAccountUsername": admin_username, "AdminAccountPassword": adminPassword}))
            response.headers["Content-Type"] = "application/json"
            return response
        else:
            response = make_response({"message": "Accounts were not created."}, 500)
            response.headers["Content-Type"] = "application/json"
            return response
    except Exception as ex:
        error_message = "Something unexpected occurred when creating new accounts."
        return respond_with_exception(ex, error_message, 500)

@app.route("/accounts", methods=['PUT'])
@require_verified_jwt_token
def enable_and_unlock_account():
    data = request.get_json()

    try:
        result = active_directory_users.enable_and_unlock_account(data['Username'], data['AccountType'])
        if result:
            response = make_response(jsonify({"success": True}))
            response.headers["Content-Type"] = "application/json"
            return response
        else:
            response = make_response(jsonify({"success": False}), 500)
            response.headers["Content-Type"] = "application/json"
            return response
    except Exception as ex:
        error_message = "Something unexpected occurred when enabling and unlocking user accounts."
        return respond_with_exception(ex, error_message, 500)

@app.route("/accounts", methods=['PATCH'])
@require_verified_jwt_token
def reset_password():
    data = request.get_json()
    password = generate_password()

    try:
        result = active_directory_users.reset_password(data['Username'], password, data['AccountType'])
        if result:

            if data['AccountType'] == 'admin':
                recipient_email = data['Username'].replace("_admin", "") + "@vmware.com"
            else:
                recipient_email = data['Username'] + "@vmware.com"
            send_password_reset_email(recipient_email, data['Username'], password)
            response = make_response(jsonify({"success": True, "username": data['Username'], "password": password}))
            response.headers["Content-Type"] = "application/json"
            return response
        else:
            response = make_response(jsonify({"success": False, "username": data['Username']}), 500)
            response.headers["Content-Type"] = "application/json"
            return response
    except Exception as ex:
        error_message = "Something unexpected occurred when resetting password for user accounts."
        return respond_with_exception(ex, error_message, 500)


@app.route("/accounts", methods=['DELETE'])
@require_verified_jwt_token
def delete_user_accounts():
    username = request.args.get('username')
    try:
        result = active_directory_users.delete_user_accounts(username)
        if result:
            return "Success"
        else:
            return "Fail", 500
    except Exception as ex:
        error_message = "Something unexpected occurred deleting user accounts."
        return respond_with_exception(ex, error_message, 500)

def generate_password():
    password = ''.join(random.SystemRandom().choice("abcdefghijkmnpqrstuvwxyz") for _ in range(2))
    password += ''.join(random.SystemRandom().choice("ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(1))
    password += ''.join(random.SystemRandom().choice("123456789") for _ in range(4))
    password += ''.join(random.SystemRandom().choice("!@#$%&?") for _ in range(1))
    return password

def send_accounts_created_email(recipient_firstname, recipient_email, user_username, user_password, admin_username, admin_password):
    template = open('WelcomeEmail.html', 'r')
    content = template.read()
    template.close()
    content = content.replace('FIRSTNAME', recipient_firstname)
    content = content.replace('USER_ACCOUNT_USERNAME', user_username)
    content = content.replace('USER_ACCOUNT_PASSWORD', user_password)
    content = content.replace('ADMIN_ACCOUNT_USERNAME', admin_username)
    content = content.replace('ADMIN_ACCOUNT_PASSWORD', admin_password)

    message = Mail(
        from_email=yaml_dict['SendGridSenderEmail'],
        to_emails=recipient_email,
        subject='Your Lab Accounts Have Been Created!',
        html_content=content)
    try:
        sg = SendGridAPIClient(yaml_dict['SendGridApiKey'])
        sg.send(message)
    except Exception as e:
        print(str(e))
        logging.error(str(e))

def send_password_reset_email(recipient_email, username, password):
    template = open('PasswordResetEmail.html', 'r')
    content = template.read()
    template.close()
    content = content.replace('ACCOUNT_USERNAME', username)
    content = content.replace('ACCOUNT_PASSWORD', password)

    # SendGrid
    message = Mail(
        from_email=yaml_dict['SendGridSenderEmail'],
        to_emails=recipient_email,
        subject='Your Lab Account Password Has Been Reset',
        html_content=content)
    try:
        sg = SendGridAPIClient(yaml_dict['SendGridApiKey'])
        sg.send(message)
    except Exception as e:
        print(str(e))
        logging.error(str(e))


def log_error(ex):
    """
    Generic error logger that will use NSXT API Error message decoders for
    more descriptive information on errors
    """
    api_error = ex.data.convert_to(ApiError)
    print("Error configuring {}".format(api_error.error_message))
    print("{}".format(api_error.__dict__))
    print("{}".format(api_error.details))

    logging.error("Error configuring {}".format(api_error.error_message))
    logging.error("{}".format(api_error.__dict__))
    logging.error("{}".format(api_error.details))


if __name__ == "__main__":
    app.run()
    #app.run(port=8080, debug=True)
