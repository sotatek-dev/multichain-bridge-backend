import { Global, Module } from "@nestjs/common";
import { LambdaService } from "./lambda.service.js";

@Global()
@Module({
    providers: [LambdaService],
    exports: [LambdaService]
})
export class AwsModule { }