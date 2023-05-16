import { FastifyInstance } from 'fastify';

import { erc20Allowance } from "./standard/allowance";
import { erc20AllowanceOf } from "./standard/allowanceOf";
import { erc20TotalSupply } from "./standard/totalSupply";
import { erc20Balance } from './standard/balance';
import { erc20BalanceOf } from './standard/balanceOf';
import { erc20GetMetadata } from './standard/get';
import { erc20SetAlowance } from './standard/setAllowance';
import { erc20NormalizeAmount } from './standard/normalizeAmount';
import { erc20Transfer } from './standard/transfer';
import { erc20TransferFrom } from './standard/transferFrom';

export const erc20Routes = async (fastify: FastifyInstance) => {
    await fastify.register(erc20Allowance);
    await fastify.register(erc20AllowanceOf);
    await fastify.register(erc20Balance);
    await fastify.register(erc20BalanceOf);
    await fastify.register(erc20GetMetadata);
    await fastify.register(erc20NormalizeAmount);
    await fastify.register(erc20SetAlowance);
    await fastify.register(erc20TotalSupply);
    await fastify.register(erc20Transfer);
    await fastify.register(erc20TransferFrom);
};