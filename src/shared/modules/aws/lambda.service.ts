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
    async invokeSignTxMina({ jsonTx, dailyQuotaPerAddress, dailyQuotaSystem }: { jsonTx: string, dailyQuotaPerAddress: number, dailyQuotaSystem: number }) {
        assert(typeof jsonTx === 'string', 'invalid payload mina')
        const command = new InvokeCommand({
            FunctionName: "prod-mina-bridge-sign-mina-tx",
            Payload: JSON.stringify({ jsonTx, dailyQuotaPerAddress, dailyQuotaSystem }),
        });

        const response = await this.client.send(command);
        console.log('lambda response', new TextDecoder().decode(response.Payload));

        const { success = false, signedTx = null, message = '', isPassedDailyQuota = false } = JSON.parse(new TextDecoder().decode(response.Payload))
        return { signedTx, isPassedDailyQuota, message, success }
    }
    async invokeSignTxEth({ rawTxObj, dailyQuotaPerAddress, dailyQuotaSystem }: { rawTxObj: any, dailyQuotaPerAddress: number, dailyQuotaSystem: number }) {
        assert(typeof rawTxObj === 'object', 'invalid payload eth')
        const command = new InvokeCommand({
            FunctionName: "prod-mina-bridge-sign-eth-tx",
            Payload: JSON.stringify({ rawTxObj, dailyQuotaPerAddress, dailyQuotaSystem }),
        });

        const response = await this.client.send(command);
        console.log(JSON.parse(new TextDecoder().decode(response.Payload)));

        const { success = false, signedTx = null, message = '', isPassedDailyQuota = false } = JSON.parse(new TextDecoder().decode(response.Payload))
        return { signedTx, isPassedDailyQuota, message, success }

    }
}