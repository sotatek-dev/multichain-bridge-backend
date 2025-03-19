import { Global, Module } from '@nestjs/common';
import { ZkWorkerService } from './zkworker.service.js';

@Global()
@Module({
    imports: [],
    controllers: [],
    providers: [ZkWorkerService],
    exports: [ZkWorkerService]
})
export class ZkWorkderModule { }