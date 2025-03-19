import { Injectable, } from "@nestjs/common";
import { LoggerService } from "../../shared/modules/logger/logger.service.js";
import { ZkWorkerService } from "../../shared/modules/zkworker/zkworker.service.js";
import { UserLockProofCreateJobDto, UserLockProofFetchJobDto } from "./dto/user-proof-request.dto.js";


@Injectable()
export class ZkProofer {
    constructor(private readonly loggerService: LoggerService, private readonly zkWorkerService: ZkWorkerService) {
    }
    private logger = this.loggerService.getLogger("ZkSigner")

    public async createJobProofLock(payload: UserLockProofCreateJobDto) {
        return this.zkWorkerService.createJobProofUserLock(payload)
    }
    public async checkJobProofLock(jobId: string) {
        return this.zkWorkerService.checkJobProofUserLock({ jobId })
    }
}