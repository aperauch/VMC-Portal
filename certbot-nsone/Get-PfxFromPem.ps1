param(
    [Parameter(Mandatory=$true)]
    [string] $CertSubject,
    [Parameter(Mandatory=$true)]
    [string] $PrivateKeyPassword,
    [string] $CertbotLiveCertFolder = "C:\Certbot\live",
    [string] $OutputFolder = "E:\User_Requested_Certs"
)

[string] $fullChain = "{0}\{1}\fullchain.pem" -f $CertbotLiveCertFolder, $CertSubject
[string] $privateKey = "{0}\{1}\privkey.pem" -f $CertbotLiveCertFolder, $CertSubject
[string] $outputFilepath = "{0}\{1}" -f $OutputFolder, $CertSubject
[string] $pfxFilename = $CertSubject + ".pfx"
[string] $pfxFilepath = "{0}\{1}" -f $outputFilepath, $pfxFilename
[string] $zipFilepath = "{0}\{1}.zip" -f $outputFilepath, $CertSubject

# Create output folder if it does not exist
if ((Test-Path $outputFilepath) -eq $false) {
    New-Item -Path $outputFilepath -ItemType Directory
}

# Create pfx cert
.\openssl\openssl.exe pkcs12 -export -in $fullChain -inkey $privateKey -out $pfxFilepath -passout pass:$PrivateKeyPassword 

# Force copy .pem files to same directory as .pfx file
Copy-Item -Path $fullChain -Destination $outputFilepath -Force
Copy-Item -Path $privateKey -Destination $outputFilepath -Force

# Force create new zip archive file
Compress-Archive -Path ($outputFilepath + "\*") -DestinationPath $zipFilepath -Force