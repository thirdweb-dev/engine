/*
  Warnings:

  - Added the required column `algorithm` to the `keypairs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "keypairs" ADD COLUMN     "algorithm" TEXT NOT NULL;
