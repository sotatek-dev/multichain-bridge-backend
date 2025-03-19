import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EEnvKey } from "../../../constants/env.constant.js";
import { getMinaNetworkId } from "../../../shared/utils/util.js";
import { zkCloudWorkerClient } from "zkcloudworker";

@Injectable({})
export class ZkWorkerService {
    private client: zkCloudWorkerClient
    constructor(private readonly configService: ConfigService) {
        this.client = new zkCloudWorkerClient({
            jwt: configService.get(EEnvKey.ZK_WORKER_JWT)!,
            chain: getMinaNetworkId() === 'mainnet' ? 'mainnet' : 'devnet',
        });
    }
    createJobProofUserLock({ tokenAddress, amount, address }: any) {
        const contractAddress = this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS)
        return this.client.execute({
            developer: 'Sotatek-TanHoang',
            repo: 'worker-bridge-multichain',
            transactions: [],
            task: "user-lock",
            args: JSON.stringify({
                contractAddress,
                tokenAddress,
                address,
                amount
            }),
            metadata: 'one'
        });
    }
    async checkJobProofUserLock({ jobId }: any) {
        const { result = null } = await this.client.jobResult({
            jobId,
        })
        return result;
    }
}