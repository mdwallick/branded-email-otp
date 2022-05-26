variable "org_name" {}
variable "base_url" {}
variable "api_token" {}

terraform {
  required_providers {
    okta = {
      source  = "okta/okta"
      version = "~> 3.28.0"
    }
  }
}
provider "okta" {
  org_name  = var.org_name
  base_url  = var.base_url
  api_token = var.api_token
}
resource "okta_group" "funauth_admins" {
  name        = "FunAuth.Admins"
  description = "Users in this group are granted admin access to FunAuth"
}
resource "okta_group" "funauth_users" {
  name        = "FunAuth.Users"
  description = "Users in this group are regular FunAuth users"
}
resource okta_authenticator "okta_email" {
  key      = "okta_email"
  name     = "Email"
  status   = "ACTIVE"
  settings = jsonencode(
  {
    "allowedFor": "any",
    "tokenLifetimeInMinutes": 5
  }
  )
}
resource okta_authenticator "okta_verify" {
  key      = "okta_verify"
  name     = "Okta Verify"
  status   = "ACTIVE"
  settings = jsonencode(
  {
    "compliance": {
      "fips": "OPTIONAL"
      },
      "channelBinding": {
          "style": "NUMBER_CHALLENGE",
          "required": "HIGH_RISK_ONLY"
      },
      "userVerification": "PREFERRED"
  }
  )
}
resource okta_authenticator "phone_number" {
  key      = "phone_number"
  name     = "Phone"
  status   = "ACTIVE"
  settings = jsonencode(
  {
    "allowedFor": "any"
  }
  )
}
resource okta_authenticator "webauthn" {
  key    = "webauthn"
  name   = "Security Key or Biometric"
  status = "ACTIVE"
}
resource "okta_policy_mfa" "funauth_admin_policy" {
  name        = "FunAuth Admins"
  status      = "ACTIVE"
  description = "Allowed Authenticators for FunAuth admins"
  is_oie      = true
  priority    = 1
  
  okta_email = {
    enroll = "REQUIRED"
  }
  okta_verify = {
    enroll = "NOT_ALLOWED"
  }
  okta_password = {
    enroll = "REQUIRED"
  }
  phone_number = {
    enroll = "OPTIONAL"
  }
  webauthn = {
    enroll = "NOT_ALLOWED"
  }

  groups_included = ["${okta_group.funauth_admins.id}"]
}
resource okta_policy_rule_mfa "funauth_admin_policy_rule" {
  name      = "Default rule"
  policy_id = okta_policy_mfa.funauth_admin_policy.id
  status    = "ACTIVE"
}
resource "okta_policy_mfa" "funauth_user_policy" {
  name        = "FunAuth Users"
  status      = "ACTIVE"
  description = "Allowed Authenticators for FunAuth users"
  is_oie      = true
  priority    = 2
  
  okta_email = {
    enroll = "REQUIRED"
  }
  okta_verify = {
    enroll = "NOT_ALLOWED"
  }
  okta_password = {
    enroll = "REQUIRED"
  }
  phone_number = {
    enroll = "OPTIONAL"
  }
  webauthn = {
    enroll = "NOT_ALLOWED"
  }

  groups_included = ["${okta_group.funauth_users.id}"]
}
resource okta_policy_rule_mfa "funauth_user_policy_rule" {
  name      = "Default rule"
  policy_id = okta_policy_mfa.funauth_user_policy.id
  status    = "ACTIVE"
}
resource "okta_app_oauth" "funauth_oidc" {
  label          = "FunAuth Lab"
  type           = "browser"
  response_types = ["code"]
  issuer_mode    = "CUSTOM_URL"
  grant_types    = [
      "authorization_code",
      "interaction_code",
      "refresh_token"
  ]
  redirect_uris = [
    "http://localhost:8080/"
  ]
  post_logout_redirect_uris = [
      "http://localhost:8080/"
  ]
  lifecycle {
     ignore_changes = [groups]
  }
  token_endpoint_auth_method = "none" # enables PKCE
}
# create the custom field for app role
resource "okta_app_user_schema_property" "funauth_app_role" {
  app_id      = okta_app_oauth.funauth_oidc.id
  index       = "funAuthRole"
  title       = "FunAuth Role"
  type        = "string"
  description = "Pick list for funAuth app role"
  master      = "OKTA"
  scope       = "NONE"
  permissions = "READ_WRITE"
  enum = [
    "ADMIN",
    "USER"
  ]
  one_of {
    const = "ADMIN"
    title = "Admin"
  }
  one_of {
    const = "USER"
    title = "User"
  }
}
# Create the App Assignment
resource "okta_app_group_assignment" "admin" {
  app_id     = okta_app_oauth.funauth_oidc.id
  group_id   = okta_group.funauth_admins.id
  priority   = 1
  depends_on = [
    okta_app_user_schema_property.funauth_app_role
  ]
  profile = jsonencode(
  {
    "funAuthRole": "ADMIN"
  }
  )
}
resource "okta_app_group_assignment" "users" {
  app_id     = okta_app_oauth.funauth_oidc.id
  group_id   = okta_group.funauth_users.id
  priority   = 2
  depends_on = [
    okta_app_user_schema_property.funauth_app_role
  ]
  profile = jsonencode(
  {
    "funAuthRole": "USER"
  }
  )
}
resource "okta_trusted_origin" "funauth_http" {
  name   = "FunAuth HTTP"
  origin = "http://localhost:8080"
  scopes = ["REDIRECT", "CORS"]
}
resource "okta_inline_hook" "token-hook" {
  name    = "Token Hook API-Example 1"
  version = "1.0.0"
  type    = "com.okta.oauth2.tokens.transform"
  channel = {
    version = "1.0.0"
    uri     = "https://api.thorax.studio/hooks/oidc/example-1"
    method  = "POST"
  }
  auth = {
    key   = "x-api-key"
    type  = "HEADER"
    value = "z8h7m92m4s8ancCSK5tuJ1DODuE7DvOl6MNIeDoB"
  }
}
resource "okta_auth_server" "funauth_authz" {
  name        = "FunAuth"
  description = "Generated by Terraform"
  audiences   = ["api://funAuth"]
  issuer_mode = "CUSTOM_URL"
}
resource "okta_auth_server_policy" "funauth_policy" {
  auth_server_id   = okta_auth_server.funauth_authz.id
  status           = "ACTIVE"
  name             = "standard"
  description      = "Generated by Terraform"
  priority         = 1
  client_whitelist = ["${okta_app_oauth.funauth_oidc.id}"]
}
resource "okta_auth_server_policy_rule" "funauth_policy_rule" {
  auth_server_id  = okta_auth_server.funauth_authz.id
  policy_id       = okta_auth_server_policy.funauth_policy.id
  status          = "ACTIVE"
  name            = "one_hour"
  priority        = 1
  group_whitelist = [
    okta_group.funauth_admins.id,
    okta_group.funauth_users.id,
  ]
  grant_type_whitelist = ["authorization_code", "interaction_code"]
  scope_whitelist      = ["*"]
  inline_hook_id = okta_inline_hook.token-hook.id
}
resource okta_auth_server_claim "approle" {
  auth_server_id = okta_auth_server.funauth_authz.id
  name           = "funAuthRole"
  value          = "appuser.funAuthRole"
  claim_type     = "IDENTITY"
  always_include_in_token = true
}
resource "okta_auth_server_claim" "groups" {
  auth_server_id = okta_auth_server.funauth_authz.id
  name           = "groups"
  value_type     = "GROUPS"
  value          = "FunAuth."
  claim_type     = "IDENTITY"
  group_filter_type = "STARTS_WITH"
  always_include_in_token = true
}
resource "okta_auth_server_claim" "usergroup" {
  auth_server_id = okta_auth_server.funauth_authz.id
  name           = "userGroup"
  value_type     = "GROUPS"
  value          = ".Users"
  claim_type     = "IDENTITY"
  group_filter_type = "CONTAINS"
  always_include_in_token = true
}
#
# NOT YET SUPPORTED BY TERRAFORM PROVIDER
#
# enable/configure the custom OTP authenticator
# resource "okta_authenticator" "emailotp" {
#   name = "Multi-branded Email OTP"
#   key = "custom_otp"
#   settings = jsonencode(
#     {
#       "passCodeLength": "6",
#       "algorithm": "HMacSHA512",
#       "timeIntervalInSeconds": "30",
#       "acceptableAdjacentIntervals": "3"
#       "encoding": "base32"
#     }
#   )
# }
output "client_id" {
  value = "${okta_app_oauth.funauth_oidc.client_id}"
}
output "auth_server_id" {
  value = "${okta_auth_server.funauth_authz.id}"
}
output "issuer" {
  value = "${okta_auth_server.funauth_authz.issuer}"
}
