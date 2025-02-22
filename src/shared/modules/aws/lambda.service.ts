import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import assert from "assert";
import { isDevelopmentEnvironment } from "../../../shared/utils/util.js";
import { EEnvKey } from "../../../constants/env.constant.js";



@Injectable()
export class LambdaService {
    private client: LambdaClient
    constructor(private readonly configService: ConfigService) {
        let credentials = undefined;
        if (isDevelopmentEnvironment()) {
            credentials = {
                accessKeyId: "",
                secretAccessKey: "",
            }
        }
        this.client = new LambdaClient(
            {
                region: this.configService.get(EEnvKey.LAMBDA_REGION), // Change to your AWS region
                credentials,
            }
        );
    }
    async invokeSignTxMina({ jsonTx }: { jsonTx: string }) {
        assert(typeof jsonTx === 'string', 'invalid payload mina')
        const command = new InvokeCommand({
            FunctionName: "prod-mina-bridge-sign-mina-tx",
            Payload: JSON.stringify({ jsonTx }),
        });

        const response = await this.client.send(command);
        console.log('lambda response', new TextDecoder().decode(response.Payload));
        
        const { success = false, signedTx, message = '' } = JSON.parse(new TextDecoder().decode(response.Payload))
        assert(success, 'Sign tx mina failed from lambda ' + String(message))
        return signedTx
    }
    async invokeSignTxEth(rawTxObj: any) {
        assert(typeof rawTxObj === 'object', 'invalid payload eth')
        const command = new InvokeCommand({
            FunctionName: "prod-mina-bridge-sign-eth-tx",
            Payload: JSON.stringify(rawTxObj),
        });

        const response = await this.client.send(command);
        console.log(JSON.parse(new TextDecoder().decode(response.Payload)));
        
        const { success = false, signedTx, message = '' } = JSON.parse(new TextDecoder().decode(response.Payload))
        assert(success, 'Sign tx eth failed from lambda ' + String(message))
        return signedTx

    }
}