// 型を決める

import { OrderWithCounter } from '@opensea/seaport-js/lib/types';
import { ethers } from 'ethers';
import { NextResponse } from 'next/server';


export interface NFTMetaData {
    tokenId: string | undefined,
    name: string | undefined,
    description: string | undefined,
    image: string | undefined,
    price: string | undefined,
    signer: ethers.Signer | undefined,
}

export type OrderWithNFTInfo = OrderWithCounter & NFTMetaData;