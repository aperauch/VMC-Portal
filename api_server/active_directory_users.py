import logging
import ssl
from flask import json
import ldap3
from ldap3 import Server, \
    Connection, \
    SUBTREE, \
    ALL_ATTRIBUTES, \
    Tls, MODIFY_REPLACE

OBJECT_CLASS = ['top', 'person', 'organizationalPerson', 'user']
LDAP_HOST = ''
LDAP_USER = ''
LDAP_PASSWORD = ''
LDAP_BASE_DN = ''
USER_TEMPLATE_USERNAME = ''
USERS_DN = ""
ADMIN_TEMPLATE_USERNAME = ''
ADMINS_DN = ""
search_filter = "(sAMAccountName={0})"
tls_configuration = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)


def find_ad_users(username):
    with ldap_connection() as c:
        c.search(search_base=LDAP_BASE_DN,
                 search_filter=search_filter.format(username),
                 search_scope=SUBTREE,
                 attributes=ALL_ATTRIBUTES,
                 get_operational_attributes=True)

    return json.loads(c.response_to_json())


def create_ad_user(username, forename, surname, new_password, user_type):
    with ldap_connection() as c:
        attributes = get_attributes(username, forename, surname)
        groups_to_join = None

        if user_type == "user":
            user_dn = get_user_dn(forename, surname)
            template = find_ad_users(USER_TEMPLATE_USERNAME)
            if template['entries'][0]['attributes'].get('memberOf'):
                groups_to_join = template['entries'][0]['attributes']['memberOf']
        elif user_type == "admin":
            user_dn = get_admin_dn(forename, surname)
            template = find_ad_users(ADMIN_TEMPLATE_USERNAME)
            if template['entries'][0]['attributes'].get('memberOf'):
                groups_to_join = template['entries'][0]['attributes']['memberOf']
        else:
            return "Unknown user_type received.  Expecting value of 'user' or 'admin' but received {0}".format(user_type)

        if c.tls_started == False:
            c.start_tls()

        result = c.add(dn=user_dn,
                       object_class=OBJECT_CLASS,
                       attributes=attributes)
        if not result:
            msg = "User '{0}' was not created.  {1}".format(username, c.result.get("description"))
            logging.error(msg)
            return json.dumps({"Error": True, "Message": msg, "Result": c.result.get("description")})

        # unlock and set password
        unlock_result = c.extend.microsoft.unlock_account(user=user_dn)
        password_set_result = c.extend.microsoft.modify_password(user_dn, new_password, old_password=None)

        # Enable account - must happen after user password is set
        enable_account = {"userAccountControl": (MODIFY_REPLACE, [544])}
        ldap_account_status_code = enable_account['userAccountControl'][1][0]
        created = c.modify(user_dn, changes=enable_account)

        # Add groups
        if created:
            if groups_to_join == None:
                logging.warning("Template account is not a member of any groups, so the newly created account was not added to any groups.")
            elif len(groups_to_join) >= 1:
                group_join_result = c.extend.microsoft.add_members_to_groups([user_dn], groups_to_join)
                logging.info("Added newly created users to group")
            else:
                logging.error("Unknown error when adding user to groups.")
            return find_ad_users(username)
        else:
            return json.dumps({"Error": True, "Result": "Failure creating account " + username})

def enable_and_unlock_account(username, user_type):
    with ldap_connection() as c:
        account_details = find_ad_users(username)
        forename = account_details['entries'][0]['attributes']['givenName']
        surname = account_details['entries'][0]['attributes']['sn']
        if user_type == "user":
            user_dn = get_user_dn(forename, surname)
        elif user_type == "admin":
            user_dn = get_admin_dn(forename, surname)
        else:
            raise Exception("Unknown user_type received.  Expecting value of 'user' or 'admin' but received {0}".format(user_type))

        if c.tls_started == False:
            c.start_tls()

        # unlock and enable
        unlock_result = c.extend.microsoft.unlock_account(user=user_dn)
        enable_account = {"userAccountControl": (MODIFY_REPLACE, [544])}
        result = c.modify(user_dn, changes=enable_account)
        if result:
            return True
        else:
            return False

def reset_password(username, new_password, user_type):
    with ldap_connection() as c:
        account_details = find_ad_users(username)
        forename = account_details['entries'][0]['attributes']['givenName']
        surname = account_details['entries'][0]['attributes']['sn']
        if user_type == "user":
            user_dn = get_user_dn(forename, surname)
        elif user_type == "admin":
            user_dn = get_admin_dn(forename, surname)
        else:
            raise Exception("Unknown user_type received.  Expecting value of 'user' or 'admin' but received {0}".format(user_type))

        if c.tls_started == False:
            c.start_tls()
        
        # unlock and set password
        unlock_result = c.extend.microsoft.unlock_account(user=user_dn)
        password_reset_result = c.extend.microsoft.modify_password(user_dn, new_password, old_password=None)

        # Enable account - must happen after user password is set
        enable_account = {"userAccountControl": (MODIFY_REPLACE, [544])}
        result = c.modify(user_dn, changes=enable_account)
        if result:
            return True
        else:
            return False

def delete_user_accounts(username):
    with ldap_connection() as c:
        account_details = find_ad_users(username)
        forename = account_details['entries'][0]['attributes']['givenName']
        surname = account_details['entries'][0]['attributes']['sn']       
        user_dn = get_user_dn(forename, surname)
        admin_dn = get_admin_dn(forename, surname)

        if c.tls_started == False:
            c.start_tls()
        
        user_result = c.delete(user_dn)
        admin_result = c.delete(admin_dn)

        if user_result & admin_result:
            return True
        else:
            return False

def ldap_connection():
    server = ldap_server()
    return Connection(server, user=LDAP_USER,
                      password=LDAP_PASSWORD,
                      auto_bind=True)


def ldap_server():
    return Server(LDAP_HOST, use_ssl=False, tls=tls_configuration)

def get_user_dn(forename, surname):
    return "CN={0} {1},".format(forename, surname) + USERS_DN

def get_admin_dn(forename, surname):
    return "CN={0} {1},".format(forename, surname) + ADMINS_DN

def get_attributes(username, forename, surname):
    return {
        "displayName": "{0} {1}".format(forename, surname),
        "sAMAccountName": username,
        "userPrincipalName": "{0}@euc.vmwarepso.org".format(username),
        "name": username,
        "givenName": forename,
        "sn": surname,
        "mail": "{0}@vmwarepso.org".format(username)
    }