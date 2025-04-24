import { ethers } from 'ethers';
import { OrderWithCounter, OfferItem, ConsiderationItem } from '@opensea/seaport-js/lib/types.js';

interface NFTMetaData {
    tokenId: string | undefined,
    name: string | undefined,
    description: string | undefined,
    image: string | undefined,
    price: string | undefined,
    signer: ethers.Signer | undefined,
  }
export  type OrderWithNFTInfo = OrderWithCounter & NFTMetaData;
  