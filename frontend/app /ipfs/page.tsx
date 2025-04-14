'use client'
import { IpfsService } from './../ipfsService';
import react, { useEffect, useState } from 'react';

const ipfs = async () => {
  const ipfsService = new IpfsService();

  useEffect(() => {
    ipfsService.connectToIpfs('http://10.203.92.63:8000');
  }
  , []);
  
  return (
    <div>
      <h1>IPFS</h1>
      <button>Connect to IPFS</button>
    </div>
  );
}