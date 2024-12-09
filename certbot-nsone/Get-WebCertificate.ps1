
param(
    [Parameter(Mandatory=$true)]
    [string] $Email,
    [Parameter(Mandatory=$true)]
    [string] $DomainNames,
    [string] $DnsPluginConfigurationFilename = ".\nsone.ini",
    [int] $SecondsToWaitForDnsPropagation = 45,
    [switch] $Hsts
)

# Execute certbot command
if ($Hsts) {
    $result = certbot certonly  --non-interactive `
                                --agree-tos `
                                --email $Email `
                                --no-eff-email `
                                --dns-nsone `
                                --dns-nsone-credentials $DnsPluginConfigurationFilename `
                                --dns-nsone-propagation-seconds $SecondsToWaitForDnsPropagation `
                                --domains $DomainNames `
                                --hsts
}
else {
    $result = certbot certonly  --non-interactive `
                                --agree-tos `
                                --email $Email `
                                --no-eff-email `
                                --dns-nsone `
                                --dns-nsone-credentials $DnsPluginConfigurationFilename `
                                --dns-nsone-propagation-seconds $SecondsToWaitForDnsPropagation `
                                --domains $DomainNames
}

Write-Host "Result of certbot command:  $result"