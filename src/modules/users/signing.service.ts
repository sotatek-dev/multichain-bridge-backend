import { Injectable, OnModuleInit } from "@nestjs/common";
import { Bridge } from "../../modules/crawler/minaSc/Bridge.js";
import { fetchAccount, Mina, PublicKey, UInt32 } from "o1js";
import { ConfigService } from "@nestjs/config";
import { EEnvKey } from "../../constants/env.constant.js";
import { LoggerService } from "../../shared/modules/logger/logger.service.js";
import { SignSetMinMaxDto } from "./dto/sign-admin.dto.js";
import { getMinaNetworkId } from "../../shared/utils/util.js";


@Injectable()
export class ZkSigner implements OnModuleInit {
    constructor(private readonly configService: ConfigService, private readonly loggerService: LoggerService) {
    }
    private logger = this.loggerService.getLogger("ZkSigner")
    async onModuleInit() {
        const network = Mina.Network({
            mina: this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS),
            archive: this.configService.get(EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS),
            networkId: getMinaNetworkId()
        });
        Mina.setActiveInstance(network);
    }
    private async compileContract() {
        console.log('compiling contract');
        await Bridge.compile()
        console.log('compiling done')
    }
    public async signSetMinMax({ min, max, address }: SignSetMinMaxDto) {

        // build tx
        const bridgePubKey = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS)!)
        const senderPubKey = PublicKey.fromBase58(address)
        await Promise.all([
            fetchAccount({ publicKey: senderPubKey }),
            fetchAccount({ publicKey: bridgePubKey }),

        ])
        await this.compileContract()
        const zkApp = new Bridge(bridgePubKey)
        const tx = await Mina.transaction(
            {
                sender: senderPubKey,
                fee: Number(0.1) * 1e9,
            },
            async () => {
                await zkApp.setAmountLimits(new UInt32(min), new UInt32(max));
            }
        );
        await tx.prove()
        return {
            jsonTx: tx.toJSON()
        }
    }
}