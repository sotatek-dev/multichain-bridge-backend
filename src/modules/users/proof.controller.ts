import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { GuardPublic } from '../../guards/guard.decorator.js';
import { UserLockProofCreateJobDto } from './dto/user-proof-request.dto.js';
import { ZkProofer } from './proof.service.js';

@ApiTags('Proofs')
@Controller("proof")
export class ProofController {
    constructor(private readonly proofService: ZkProofer) { }

    @Post('user-lock')
    @GuardPublic()
    createJobProofUserLock(@Query() query: UserLockProofCreateJobDto) {
        return this.proofService.createJobProofLock(query);
    }

    @Get('user-lock/check/:jobId')
    @GuardPublic()
    getDailyQuota(@Param('jobId') jobId: string) {
        return this.proofService.checkJobProofLock(jobId);
    }

}
