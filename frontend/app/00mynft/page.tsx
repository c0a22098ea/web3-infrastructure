'use client'

import { ethers, isError } from 'ethers';
import { useContext, useEffect, useRef, useState } from 'react';
import { Web3SignerContext } from '@/context/web3.context';
import { Alert, Avatar, Button, Card, Container, Group, SimpleGrid, Stack, Text, TextInput, Title, Image, Badge, Modal } from '@mantine/core';
import { IconCubePlus } from '@tabler/icons-react';
import { MyERC721, MyERC721__factory } from "@/types";
import { useDisclosure } from "@mantine/hooks";
import { ethers as ethersV5 } from "ethersV5"
import { Seaport } from "@opensea/seaport-js";
import { ItemType } from "@opensea/seaport-js/lib/constants";
import { CreateOrderInput } from "@opensea/seaport-js/lib/types";
import axios from "axios";
import { OrderWithNFTInfo } from '../types';
import { IpfsService } from "../ipfsService";

// NFTデータの型定義  
type NFT = {
  tokenId: string,
  name: string,
  description: string,
  image: string,
};

// デプロイしたMyERC721 Contractのアドレスを入力  
const contractAddress = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0';

export default function MyNFT() {
  const { signer } = useContext(Web3SignerContext); // Web3サインナーのコンテキストを取得  
  const [myERC721Contract, setMyERC721Contract] = useState<MyERC721 | null>(null);

  // タイムアウトの時間(timeout)は5秒
  const fetchWithTimeout = async (url: string, options?: RequestInit, timeout = 5000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  }; 

  

  // コントラクトを接続し、セットアップ  
  useEffect(() => {
    if (signer) {
      // MyERC721コントラクトの取得
      const contract = MyERC721__factory.connect(contractAddress, signer);
      setMyERC721Contract(contract);

      // NFT作成フォームのデフォルト値として、現在のアカウントアドレスを設定
      const fillAddress = async () => {
        console.log("これはsignerのアドレス:mynft/:::", signer);
        if (ref.current) {
          const myAddress = await signer?.getAddress();
          if (myAddress) {
            ref.current.value = myAddress!;
          }
        }
      }
      fillAddress();


    }
  }, [signer]);

  // NFT発行のための状態管理  
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [nftName, setNftName] = useState<string | null>(null);
  const [nftDescription, setNftDescription] = useState<string | null>(null);

  // NFT発行ボタンのクリックハンドラー  
  const handleButtonClick = async () => {
    if (!file) {
      window.alert("NFT化する画像を入れてください");
    } else if (!nftName) {
      window.alert("NFT名を入れてください");
    } else if (!nftDescription) {
      window.alert("NFTの説明を入れてください");
    } else {
      // フォームデータを作成  
      const formData = new FormData();
      formData.append("file", file);
      formData.append("nftName", nftName);
      formData.append("nftDescription", nftDescription);

      setLoading(true); // ローディング状態開始  
      try {
        const response = await axios.post("http://10.203.92.63:8888/up-ipfs", formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const result = await IpfsService.handleUploadToIpfs(file, nftName, nftDescription);
        if (response.data.success === true) {
          console.log("アップロードここまで到達");
          const account = ref.current!.value;
          const metadataHash = response.data.metadataHash;
          const url = 'http://10.203.92.63:8080/ipfs/' + metadataHash;
          await myERC721Contract?.safeMint(account, url);
          setShowAlert(true);
          setAlertMessage(`NFT minted and sent to the wallet ${account?.slice(0, 6) + '...' + account?.slice(-2)}. Enjoy your NFT!`);
        } else {
          window.alert("アップロードできませんでした");
        }
      } finally {
        setLoading(false); // ローディング状態終了  
      }
    }
  };

  // ユーザーのNFT一覧を取得  
  const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
  useEffect(() => {  
    const fetchMyNFTs = async () => {  
      const nfts: NFT[] = [];  
      if (myERC721Contract && myERC721Contract.runner) {  
        const myAddress = await signer!.getAddress();  
        let balance = BigInt(0);  
        try {  
          balance = await myERC721Contract.balanceOf(myAddress);  
        } catch (err) {  
          if (isError(err, "BAD_DATA")) {  
            balance = BigInt(0);  
          } else {  
            throw err;  
          }  
        }  
        for (let i = 0; i < balance; i++) {  
          const tokenId = await myERC721Contract.tokenOfOwnerByIndex(myAddress, i);  
          try {  
            console.log("ここまで到達1");
            const tokenURI = await myERC721Contract.tokenURI(tokenId);  
            console.log("ここまで到達2");
            const response = await fetchWithTimeout(tokenURI);
            console.log("ここまで到達3");  
            const jsonMetaData = await response.json();
            console.log("ここまで到達4");  
            nfts.push({ tokenId, ...jsonMetaData });
            console.log("ここまで到達5");  
          } catch (error) {  
            console.error(`Failed to fetch metadata for tokenId ${tokenId}:`, error);  
            // デフォルトのメタデータを設定する  
            const jsonMetaData = {
              name: `NFT番号 #${tokenId}`,
              description: 'NFTメタデータを取得できませんでした。',
              image: '' 
            }
            nfts.push({ tokenId: tokenId.toString(), ...jsonMetaData });  
          }  
        }  
        setMyNFTs(nfts);  
      }  
    };  
    fetchMyNFTs();  
  }, [myERC721Contract, signer]);

  // アラートメッセージの管理  
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Seaportのセットアップ  
  const seaportAddress = "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9";
  const [mySeaport, setMySeaport] = useState<Seaport | null>(null);
  useEffect(() => {
    const setupSeaport = async () => {
      if (signer) {
        const { ethereum } = window as any;
        const ethersV5Provider = new ethersV5.providers.Web3Provider(ethereum);
        const ethersV5Signer = await ethersV5Provider.getSigner();
        const lSeaport = new Seaport(ethersV5Signer, {
          overrides: {
            contractAddress: seaportAddress,
          }
        });
        setMySeaport(lSeaport);
      }
    }
    setupSeaport();
  }, [signer]);

  // モーダルの管理  
  const [opened, { open, close }] = useDisclosure(false);
  const refSellOrder = useRef<HTMLInputElement>(null);
  const [loadingSellOrder, setLoadingSellOrder] = useState(false);
  const [sellTargetTokenId, setSellTargetTokenId] = useState<string | null>(null);

  const openModal = (tokenId: string) => {
    setSellTargetTokenId(tokenId);
    open();
  }

  // 売り注文を作成するハンドラー  
  const createSellOrder = async () => {
    if (!signer) {
      window.alert("ウォレットが接続されていません。");
      return;
    }

    if (!sellTargetTokenId) {
      window.alert("有効なNFTを選択してください。");
      return;
    }

    try {
      setLoadingSellOrder(true);
      const price = refSellOrder.current?.value;
      if (!price) {
        window.alert("価格を入力してください。");
        return;
      }
      const nft = myNFTs.find(nft => nft.tokenId.toString() === sellTargetTokenId);

      if (!nft) {
        window.alert("選択されたNFTが見つかりません。");
        return;
      }

      // Seaportの注文作成  
      const firstStandardCreateOrderInput = {
        offer: [
          {
            itemType: ItemType.ERC721,
            token: contractAddress,
            identifier: sellTargetTokenId
          }
        ],
        consideration: [
          {
            itemType: ItemType.ERC721, // 任意のERC721を受け入れる  
            token: contractAddress, // MyERC721のアドレスのみを受け入れる
            identifier: "0",
            recipient: await signer?.getAddress()!,
          }
        ],
        // orderType: 1, // RESTRICTED: 出品者かゾーンが承認した場合にのみ注文が実行される  
        startTime: Math.floor(Date.now() / 1000), // 現在のタイムスタンプ  
        endTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1週間後に期限切れ  
        zone: ethers.ZeroAddress, // ゾーンの指定が不要であれば0アドレス  
        zoneHash: ethers.ZeroHash, // 任意のゾーンハッシュ  
        salt: ethers.randomBytes(32), // ランダムなソルト  
        conduitKey: ethers.ZeroHash, // デフォルトのコンジットを使用  
        counter: 0 // オファーのカウンター 
      } as CreateOrderInput;

      // Seaportを利用して注文を実行  
      const orderUseCase = await mySeaport!.createOrder(firstStandardCreateOrderInput);
      const order = await orderUseCase.executeAllActions();
      console.log("これがorderの値,", order);

      // 売り注文情報を保存  
      const sellOrderWithNFTInfo: OrderWithNFTInfo = {
        ...order,
        tokenId: nft.tokenId.toString(),
        name: nft.name,
        description: nft.description,
        image: nft.image,
        price: price,
        signer: signer ?? undefined,
      };

      // サーバーに売り注文情報を送信  
      await axios.post("http://10.203.92.63:8888/save-nft", { data: sellOrderWithNFTInfo })
        .then(() => {
          fetch('/api/order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(sellOrderWithNFTInfo)
          });
          setShowAlert(true);
          setAlertMessage(`NFT (${sellTargetTokenId}) is now listed for trade`);
        })
        .catch(error => {
          console.error("NFT出品中にエラーが発生しました:", error);
          window.alert("NFT出品中にエラーが発生しました。");
        });
    } finally {
      setLoadingSellOrder(false); // ローディング状態終了  
      setSellTargetTokenId(null);
      close();
    }
  };

  return (
    <div>
      <Title order={1} style={{ paddingBottom: 12 }}>My NFT Management</Title>
      {showAlert ?
        <Container py={8}>
          <Alert
            variant='light'
            color='teal'
            title='NFT Minted Successfully!'
            withCloseButton
            onClose={() => setShowAlert(false)}
            icon={<IconCubePlus />}>
            {alertMessage}
          </Alert>
        </Container> : null}
      <SimpleGrid cols={{ base: 1, sm: 3, lg: 5 }}>
        <Card shadow='sm' padding='lg' radius='md' withBorder>
          <Card.Section>
            <Container py={12}>
              <Group justify='center'>
                <Avatar color='blue' radius='xl'>
                  <IconCubePlus size='1.5rem' />
                </Avatar>
                <Text fw={700}>Mint Your NFTs !</Text>
              </Group>
            </Container>
          </Card.Section>
          <Stack>
            <TextInput
              ref={ref}
              label='Wallet address'
              placeholder='0x0000...' />
            <label>NFT化する画像</label>
            <input type='file' onChange={(e) => { setFile(e.target.files?.[0] || null) }} />
            <label>NFT名</label>
            <input type='text' onChange={(e) => { setNftName(e.target.value || null) }} />
            <label>NFTの説明</label>
            <input type='text' onChange={(e) => { setNftDescription(e.target.value || null) }} />
            <Button loading={loading} onClick={handleButtonClick}>NFTとして発行する</Button>
          </Stack>
        </Card>
        {myNFTs.map((nft, index) => (
          <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
            <Card.Section>
              <Image
                src={nft.image}
                height={160}
                alt="No image"
              />
            </Card.Section>
            <Group justify="space-between" mt="md" mb="xs">
              <Text fw={500}>{nft.name}</Text>
              <Badge color="blue" variant="light">
                tokenId: {nft.tokenId.toString()}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {nft.description}
            </Text>
            <Button
              variant="light"
              color="blue"
              fullWidth
              mt="md"
              radius="md"
              onClick={() => { openModal(nft.tokenId.toString()) }}
            >
              マーケットに売り出す
            </Button>
          </Card>
        ))}
      </SimpleGrid >
      <Modal opened={opened} onClose={close} title="List your NFT for trade">
        <Stack>
          <TextInput
            ref={refSellOrder}
            label="Price (ether)"
            placeholder="10" />
          <Button loading={loadingSellOrder} onClick={createSellOrder}>Create sell order</Button>
        </Stack>
      </Modal>
    </div >
  );
}  