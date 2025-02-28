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
        this.client = new LambdaClient(
            {
                region: this.configService.get(EEnvKey.LAMBDA_REGION), // Change to your AWS region
            }
        );
    }
    async invokeSignTxMina({ jsonTx, dailyQuotaPerUser, dailyQuotaSystem, amount, address }: { dailyQuotaPerUser: string, dailyQuotaSystem: string, amount: string, address: string, jsonTx: string }) {
        assert(typeof jsonTx === 'string', 'invalid payload mina')
        const command = new InvokeCommand({
            FunctionName: "prod-mina-bridge-sign-mina-tx",
            Payload: JSON.stringify({ jsonTx, dailyQuotaPerUser, dailyQuotaSystem, amount, address }),
        });

        const response = await this.client.send(command);
        console.log('lambda response', new TextDecoder().decode(response.Payload));

        const { success = false, signedTx = null, message = '', isPassedDailyQuota = false } = JSON.parse(new TextDecoder().decode(response.Payload))
        return { signedTx, isPassedDailyQuota, message, success }
    }
    async invokeSignTxEth({ dailyQuotaPerUser, dailyQuotaSystem, amount, address, rawTxObj }: { dailyQuotaPerUser: string, dailyQuotaSystem: string, amount: string, address: string, rawTxObj: any }) {
        assert(typeof rawTxObj === 'object', 'invalid payload eth')
        const command = new InvokeCommand({
            FunctionName: "prod-mina-bridge-sign-eth-tx",
            Payload: JSON.stringify({ rawTxObj, dailyQuotaPerUser, dailyQuotaSystem, amount, address }),
        });

        const response = await this.client.send(command);
        console.log(JSON.parse(new TextDecoder().decode(response.Payload)));

        const { success = false, signedTx = null, message = '', isPassedDailyQuota = false } = JSON.parse(new TextDecoder().decode(response.Payload))
        return { signedTx, isPassedDailyQuota, message, success }

    }
}