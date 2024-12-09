# Server Setup and Deployment
## Main Backend API Using Flask
### Backend Server Setup
1.	Install Git 2.29.0 64-bit with default options
    1. https://github.com/git-for-windows/git/releases/download/v2.29.0.windows.1/Git-2.29.0-64-bit.exe
2.	Python 3.9.0 64-bit
    1. https://www.python.org/ftp/python/3.9.0/python-3.9.0-amd64.exe
    2. Install with all options selected
    3. Select the option to disable the 260 max character path limit
3.	Install Flask 1.1.2
    1. Open powershell
        1. `pip install flask`
    3. If pip is not available, download get-pip.py and run
        1. `curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py`
        2. `python get-pip.py`
        3. `pip install flask`
4.	Install Flask-Cors 3.0.9
    1. `pip install flask-cors`
5.	Install the NS1 Python SDK
    1. `pip install ns1-python`
6.	Install VMC Python SDK
    1. `pip install --update pip setuptools`
    2. `pip install --upgrade git+https://github.com/vmware/vsphere-automation-sdk-python.git`
7.	Install Python-LDAP 3.3.1
    1. `pip install python-ldap`
    2. If installation fails on Windows, download the .whl 64-bit and install the .whl
        1.	Download:  https://www.lfd.uci.edu/~gohlke/pythonlibs/#python-ldap
        2.	`pip install python_ldap-3.3.1-cp39-cp39-win_amd64.whl`
8.	Install Flask-JWT 0.3.2
    1. `pip install flask-jwt`
9.	Install PyYaml 5.3.1
    1. `pip install pyyaml`

## GoLang IaaC API for Terraform Cloud
### Setup
1. Install GoLang for Windows
    1. After installation, open CMD.exe or PowerShell.exe and check the Go bin is in the path
        1. ```go version```
2. For development setup, install Go extension for Visual Studio Code and install helper modules when prompted after opening first .go file.
    1.  Close and re-open VS Code is the go.exe command is not found
3.  Create a Terraform Cloud account
4.  From the new Terraform Cloud, go to User Settings > Tokens and genreate a new API token.  Copy and save and token for this project.
4.  Open CMD.exe or PowerShell.exe and then install the offical Go API client for Terraform Cloud
    1. ```go get -u github.com/hashicorp/go-tfe```

## Backend Production Deployment
1.	Install IIS with CGI and then reboot
2.	Install IIS URL Rewrite 2 module
    1. https://www.iis.net/downloads/microsoft/url-rewrite 
3.	Install wfastcgi 3.0.0
    1. `pip install wfastcgi`
4.	Enable wfastcgi by running the below command from an elevated cmd.exe:
    1. ~~`fastcgi-enable`~~
    1. `c:\Python310\Scripts\wfastcgi-enable.exe`
5.	Configure IIS
    1. Follow this guide:  https://medium.com/@rajesh.r6r/deploying-a-python-flask-rest-api-on-iis-d8d9ebf886e9
        1. Use the following reference for the above guide:
            1. ~~`%SystemDrive%\Python\Python39\python.exe|%SystemDrive%\Python\Python39\Lib\site-packages\wfastcgi.py`~~
            1. `C:\Python310\python.exe|C:\Python310\Lib\site-packages\wfastcgi.py`
6.  Set the App Pool identity to a local user account that is a member of the local administrators group.
7.  Set the IIS virtual application to run with this App Pool.
8.  Set the local user account as the owner of the project files and helper utilities.

## Frontend Server Setup
1.	Install Node.js LTS 12.19.0 (includes npm 6.14.8)
    1. https://nodejs.org/dist/v12.19.0/node-v12.19.0-x64.msi
    2. Install all tools including chocolatey
2.	After Node.js is installed with npm, use npm to install Angular
    1. Open powershell.exe
    2. `npm install -g @angular/cli`
3.	Install Clarity
    1. `npm install @clr/core @clr/icons @clr/angular @clr/ui @webcomponents/webcomponentsjs --save`
4.	Change directory to the Angular project and then run npm install
    1. `cd .\EUC-Lab-Portal-Python\euc-lab-portal`
5.	Start the Angular frontend
    1. `ng serve`
    2. After the app compiles, browse to http://localhost:4200
6. For TLS use the following:
    1. `ng serve --host portal.example.com --port 4200 --ssl true --ssl-cert .\cert.pem --ssl-key .\key.pem`
    2.	After the app compiles, browse to https://portal.example.com:4200

## Production Deployment
1.	Open PowerShell and navigate to the Angular project folder
    1. `cd .\EUC-Lab-Portal-Python\euc-lab-portal`
    2. ~~`ng build --prod`~~
    2. `ng build --configuration production`
2.	Copy all files from .\EUC-Lab-Portal-Python\euc-lab-portal\dist\euc-lab-portal to the IIS wwwroot folder

## Development Setup
1.	Install Visual Studio Code
    1. https://code.visualstudio.com/download#
2.	Open VS Code
3.	Click Extensions
4.	Search for python
5.	Install Python extension
6.	Set Python interpreter to the installation path python was installed
7.	Click File > Open Workspace
8.	Select .\EUC-Lab-Portal-Python\vs-code-project-workspace.code-workspace
9.	Install Postman to test REST APIs for backend app
10.	Optionally install GitHub Desktop if git bash is not preferred
    1. https://desktop.github.com/

## Install Let's Encrypt Certbot
Optionally install Let's Encrypt certbot.
1.	Follow these instructions:  https://certbot.eff.org/lets-encrypt/windows-other
2.	Install to default directory:  C:\Program Files (x86)\Certbot
3.	Install certbot plugin for DNS provider if available (e.g., NS1)
    1. `pip install certbot-dns-nsone`
4.  certbot.exe must run as admin so ensure the account used as the identity of IIS App Pool to run the backend Flask API is a member of the local administrators group on the hosting Windows server.
5.  When generating a cert with the NSONE DNS plugin, certbot will check permissions on a file (assumed to be the nsone.ini config file that is required by the plugin).  The filesystem.py module was throwing an access deneied error when being run by certbot so modifying the function to fix the error or simply return true will resolve.