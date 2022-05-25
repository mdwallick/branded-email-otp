help:
	@echo "Usage:\n\tmake okta\n\tmake destroyOkta\n"
	@echo "\tmake check\nmake all"

TERRAFORM_VERSION := $(shell terraform --version 2>/dev/null)

.PHONY: check
check:
ifdef TERRAFORM_VERSION
	@echo "Found Terraform CLI: $(TERRAFORM_VERSION)"
else
	@echo "Terraform CLI not found. Please see: https://www.terraform.io/ for details."
endif

okta:
	terraform init && \
	terraform plan -out=okta.setup.tfplan && \
	terraform apply "okta.setup.tfplan"

destroyOkta:
	terraform init && \
	terraform plan -destroy -out=okta.delete.tfplan && \
	terraform apply "okta.delete.tfplan"

all: check okta
