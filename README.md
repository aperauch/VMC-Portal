# VMC Lab Portal

## Overview
The EUC Lab Portal is a self-service web application designed to help with administration and management of lab resources.  The Portal currently integrates with VMC, NSX-T, and NS1 for DNS management. It can be used to provision a public IP address, DNS, and public network access any VM workload hosted in the lab SDDC

## Getting Started
### Simple Tutorial
The following a simple example of using the portal to create the necessary resources within VMC to allow public internet access to your VM or load balancer virtual server.

1. Open Chrome and browse to https://portal.example.com
2. Login with your domain admin account
3. Request a public IP
    1. Click **Public IPs** from the vertical nav
    2. Click **REQUEST PUBLIC IP**
    3. Enter a friendly name for your IP
    4. Click **SUBMIT**
    5. A green alert message will be displayed once the IP is request is successful
    6. Copy the public IP that was provisioned for you
        1. If you don't see the IP, refresh the page or sort the table by name
4. Create a DNS record for your newly provisioned public IP address
    1. Click **Public DNS** from the vertical nav
    2. Click **ADD DNS RECORD**
    3. Select a domain zone from the drop-down menu
    4. Select the type of DNS record to create
    5. Enter the domain name for the record
    6. Paste in the public IP in the Record Answer(s) test field
    7. Click **SUBMIT**
5. Create a NAT rule to map your public IP to an internal lab IP
    1. Click **NAT Rules**
    2. Click **ADD NAT RULE**
    3. Enter a friendly name for the rule
    4. Paste in the public IP in the Public IP text field
    5. Enter in the internal IP that the public IP should map to
    6. Leave the Enable Rule switch set to **on**
    7. Click **SUBMIT**
6. Optionally review the Compute Gateway (CGW) Firewall Rules to ensure your workload specific traffic is allowed.
    1. CGW rules can be created and modified by lab admins only
7. Optionally download a wildcard web certificate for your app server
    1. Click **Certificates**
    2. Click **DOWNLOAD** for the certificate specific to the DNS zone you created earlier
    3. Unzip the downloaded file
    4. Install the PEM or PFX version of the cert on your app server or associate the load balancer virtual server with this cert if doing SSL/TLS inspection or re-encryption

## Integrations
* NS1 for DNS management
* NSX VMC AWS Integration API for public IP management
* NSX VMC Policy API for all other management aspects
* LDAP integration with Windows Active Directory for domain user account login and session management

## Technologies Used
* The web app frontend was built using [Clarity Design System](https://next.clarity.design/) and [Angular](https://angular.io/).
* The backend is a REST API web app built using Python 3 and Flask.


## Setup and Deployment
Please see SETUP.md for guidance on setting up your server to host the web app, deploying for production use, and development setup.