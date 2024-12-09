# Certificate Management

## Install Certbot and NS1 DNS Plugin
`pip install certbot`

`pip install certbot-dns-nsone`

## Certbot Commands
### Request a Wildcard Certificate Using the NS1 DNS Plugin
 `certbot certonly --dns-nsone --dns-nsone-credentials E:\GitHub\EUC-Lab-Portal-Python\certs\certbot-nsone\nsone.ini --dns-nsone-propagation-seconds 60 -d euclab.net -d *.euclab.net`


## OpenSSL Commands
### Convert PEM to PFX
The following command will prompt for a password to protect the private key

`openssl.exe pkcs12 -export -in E:\GitHub\EUC-Lab-Portal-Python\downloads\certs\euclab-net\euclab-net_fullchain.pem -inkey E:\GitHub\EUC-Lab-Portal-Python\downloads\certs\euclab-net\euclab-net_privkey.pem -out E:\GitHub\EUC-Lab-Portal-Python\downloads\certs\euclab-net\euclab-net_cert.pfx`