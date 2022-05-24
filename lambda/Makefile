CREATE_DIR ?= secret-generator
GENERATE_DIR ?= totp-generator
DELETE_DIR ?= delete-secret

help:
	@echo "Usage:\n\tmake create\n\tmake generate\n\tmake delete"
	@echo "\tmake clean\nmake all"

NPM_VERSION := $(shell npm --version 2>/dev/null)
AWS_CLI_VERSION := $(shell aws --version 2>/dev/null)

.PHONY: check
check:
ifdef NPM_VERSION
	@echo "Found npm $(NPM_VERSION)"
else
	@echo "'npm' not found. Please see: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm for details. "
endif

ifdef AWS_CLI_VERSION
	@echo "Found AWS CLI: $(AWS_CLI_VERSION)"
else
	@echo "AWS CLI not found. Please see: https://aws.amazon.com/cli/ for details."
endif

create:
		cd ${CREATE_DIR} && \
		npm install && \
		zip -r function.zip * && \
		aws lambda update-function-code --function-name generate-shared-secret --zip-file fileb://function.zip

generate:
		cd ${GENERATE_DIR} && \
		npm install && \
		zip -r function.zip * && \
		aws lambda update-function-code --function-name generate-totp --zip-file fileb://function.zip

delete:
		cd ${DELETE_DIR} && \
		npm install && \
		zip -r function.zip * && \
		aws lambda update-function-code --function-name delete-shared-secret --zip-file fileb://function.zip

clean:
		cd ${CREATE_DIR} && \
		rm -f function.zip && \
		cd ../${GENERATE_DIR} && \
		rm -f function.zip && \
		cd ../${DELETE_DIR} && \
		rm -f function.zip

all: check create generate delete clean
