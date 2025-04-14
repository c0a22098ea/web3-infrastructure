"use client"
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { Web3SignerContext } from '@/context/web3.context';

export default function CreateBuyOrder() {
  const { signer } = useContext(Web3SignerContext);
  const [nftId, setNftId] = useState('');
  const [offerNftId, setOfferNftId] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const response = await axios.post('http://10.203.92.63:8888/create-buy-order', {
        nftId,
        offerNftId,
        buyer: await signer?.getAddress()
      });
      console.log('Buy order created successfully:', response.data);
    } catch (error) {
      console.error('Error creating buy order:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={nftId} onChange={(e) => setNftId(e.target.value)} placeholder="NFT ID to buy" required />
      <input type="text" value={offerNftId} onChange={(e) => setOfferNftId(e.target.value)} placeholder="Your NFT ID to offer" required />
      <button type="submit">Create Buy Order</button>
    </form>
  );
}