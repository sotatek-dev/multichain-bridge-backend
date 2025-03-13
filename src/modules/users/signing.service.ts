import { BadRequestException, Injectable, } from "@nestjs/common";
import { LoggerService } from "../../shared/modules/logger/logger.service.js";
import { SignSetMinMaxDto, SignUnlockTxDto } from "./dto/sign-admin.dto.js";
import { LambdaService } from "../../shared/modules/aws/lambda.service.js";


@Injectable()
export class ZkSigner {
    constructor(private readonly loggerService: LoggerService, private readonly lambdaService: LambdaService) {
    }
    private logger = this.loggerService.getLogger("ZkSigner")

    public async signSetMinMax({ min, max, address }: SignSetMinMaxDto) {
        const { data, message, success } = await this.lambdaService.invokeProveAdminSetConfig({ min, max, address })
        if (!success) {
            this.logger.warn(message)
            throw new BadRequestException(message)
        }
        return {
            jsonTx: data
        }
    }
    public async signUnlockTx({ amount, tokenAddress, address }: SignUnlockTxDto) {
        const { data, message, success } = await this.lambdaService.invokeProveUserLock({ amount, tokenAddress, address })
        if (!success) {
            this.logger.warn(message)
            throw new BadRequestException(message)
        }
        return {
            jsonTx: data
        }
    }
}