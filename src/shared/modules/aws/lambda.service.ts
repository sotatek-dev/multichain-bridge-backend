import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import assert from "assert";
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
        const { success = false, signedTx = null, message = '', isPassedDailyQuota = false } = JSON.parse(new TextDecoder().decode(response.Payload))
        return { signedTx, isPassedDailyQuota, message, success }

    }

    // prove
    async invokeProveAdminSetConfig({ address, min, max }: { address: `B62${string}`, min: string, max: string }) {
        const command = new InvokeCommand({
            FunctionName: "prod-mina-bridge-sign-admin-set-config",
            Payload: JSON.stringify({ address, min: min.toString(), max: max.toString() }),
        });

        const response = await this.client.send(command);
        console.log(JSON.parse(new TextDecoder().decode(response.Payload)));

        const { success = false, data = null, message = '', } = JSON.parse(new TextDecoder().decode(response.Payload))
        return { success, data, message, }
    }

    async invokeProveUserLock({ tokenAddress, amount, address }: { address: `B62${string}`, amount: string, tokenAddress: `B62${string}` }) {
        const command = new InvokeCommand({
            FunctionName: "prod-mina-bridge-sign-user-lock-tx",
            Payload: JSON.stringify({ address, tokenAddress, amount: amount, }),
        });

        const response = await this.client.send(command);
        const { success = false, data = null, message = '', } = JSON.parse(new TextDecoder().decode(response.Payload))
        return { success, data, message, }
    }
}