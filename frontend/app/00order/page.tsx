"use client"

import { useContext, useEffect, useState } from "react";
import { Button, Card, Group, SimpleGrid, Text, Title, Image, Badge, Container, Alert, Modal, Stack } from "@mantine/core";
import { ethers, isError } from "ethers";
import { ethers as ethersV5, BigNumber as BigNumberV5 } from "ethersV5";
import { IconCubePlus, IconUser } from "@tabler/icons-react";
import { Seaport } from "@opensea/seaport-js";
import { Web3SignerContext } from "@/context/web3.context";
import { OrderWithNFTInfo } from "../types";
import axios from "axios";
import { MyERC721, MyERC721__factory } from "@/types";
import { useDisclosure } from "@mantine/hooks";

type NFT = {
  tokenId: string,
  name: string,
  description: string,
  image: string,
};
// デプロイしたMyERC721 Contractのアドレスを入力  
const contractAddress = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0';

export default function SellOrders() {
  const { signer } = useContext(Web3SignerContext);
  const [myERC721Contract, setMyERC721Contract] = useState<MyERC721 | null>(null);
  const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
  const [mySeaport, setMySeaport] = useState<Seaport | null>(null);
  const [sellOrders, setSellOrders] = useState<OrderWithNFTInfo[]>([]);
  const [alert, setAlert] = useState<{ color: string, title: string, message: string } | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithNFTInfo | null>(null);
  // const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);

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
      }
      fillAddress();


    }
  }, [signer]);

  // 売り注文を取得  
  const fetchSellOrders = async () => {
    console.log("セルオーダーを取得します");
    try {
      const response = await axios.get("/api/order");
      setSellOrders(response.data);
    } catch (error) {
      console.error('Error fetching sell orders:', error);
    }
  };

  // 自分のNFTを取得  
  const fetchMyNFTs = async () => {
    const nfts: NFT[] = [];
    if (myERC721Contract && myERC721Contract.runner) {
      const myAddress = await signer?.getAddress()!;
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
      console.log("保有しているNFTの数", balance);
      for (let i = 0; i < balance; i++) {

        try {
        const tokenId = await myERC721Contract.tokenOfOwnerByIndex(myAddress, i);
        const tokenURI = await myERC721Contract.tokenURI(tokenId);
        const response = await fetchWithTimeout(tokenURI);
        const jsonMetaData = await response.json();
        nfts.push({ tokenId, ...jsonMetaData });

      } catch (error) {
        // エラーが発生した場合、デフォルトのメタデータを使用
        const tokenId = await myERC721Contract.tokenOfOwnerByIndex(myAddress, i);
          const jsonMetaData = {
            name: `NFT番号 #${tokenId}`,
            description: 'NFTメタデータを取得できませんでした。',
            image: ``
          }
          nfts.push({ tokenId: tokenId.toString(), ...jsonMetaData });
      }
      }
      setMyNFTs(nfts);
    }
  };


  useEffect(() => {
    fetchMyNFTs();
    fetchSellOrders();

  }, [myERC721Contract, signer]);

  // Seaportのセットアップ  
  const seaportAddress = "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9";
  useEffect(() => {
    const setupSeaport = async () => {
      if (signer) {
        try {
          const { ethereum } = window as any;
          const ethersV5Provider = new ethersV5.providers.Web3Provider(ethereum);
          const ethersV5Signer = await ethersV5Provider.getSigner();
          const lSeaport = new Seaport(ethersV5Signer, {
            overrides: {
              contractAddress: seaportAddress,
            }
          });
          setMySeaport(lSeaport);
        } catch (error) {
          console.error("Seaport instance initialization failed:", error);
        }
      }
    };
    setupSeaport();
  }, [signer]);

  // 交換申請を行う  
  const requestExchange = async (selectedNFT: NFT) => {
    console.log("Seaport:", mySeaport);
    console.log("Selected Order:", selectedOrder);
    console.log("Selected NFT:", selectedNFT);

    console.log("selectedOrder_token:",selectedOrder?.parameters.offer[0].token);
    console.log("selectedOrder_token:",selectedOrder?.tokenId);
    console.log(selectedNFT.tokenId);

    if (!mySeaport || !selectedOrder || !selectedNFT) {
      setAlert({ color: 'red', title: 'Exchange Failed', message: 'Ensure all selections are made and Seaport is initialized' });
      return;
    }
    

    try {
      let newSelectedOrder = selectedOrder;
      newSelectedOrder.parameters.consideration[0].identifierOrCriteria = selectedNFT.tokenId;


      // fulfillOrderメソッドで交換を実行
      const { executeAllActions: executeAllFulfillActions } = await mySeaport.fulfillOrders({
        fulfillOrderDetails: [{
          order: newSelectedOrder, // 'order' プロパティを使用
          // unitsToFill: 1, // 交換するユニット数を指定
          offerCriteria: [{
            identifier: selectedNFT.tokenId.toString(), // 交換するNFTのtokenIdを指定
            // identifier: "1", // 交換するNFTのtokenIdを指定
            proof: [] // 証明を指定（必要に応じて設定）
          }],
          // considerationCriteria: [] // 対価の条件を指定（必要に応じて設定）
        }],
        accountAddress: await signer?.getAddress(),
        // exactApproval: false // 厳密な承認を行わない
      });

      console.log("ここまで1");

      const transaction = await executeAllFulfillActions(); // 交換アクションを実行
      
      console.log("ここまで2");
      console.log(transaction);

      console.log("ここまで3");
      setAlert({ color: 'teal', title: 'Exchange Successful', message: 'The exchange has been processed successfully.' });
      fetchSellOrders(); // 更新された売り注文を取得
    } catch (error) {
      setAlert({ color: 'red', title: 'Exchange Failed', message: (error as { message: string }).message });
    } finally {
      close(); // モーダルを閉じる
    }
  };

  return (
    <div>
      <Title order={1} style={{ paddingBottom: 12 }}>Sell NFT Orders</Title>
      {alert && (
        <Container py={8}>
          <Alert
            variant="light"
            color={alert.color}
            title={alert.title}
            withCloseButton
            onClose={() => setAlert(null)}
            icon={<IconCubePlus />}>
            {alert.message}
          </Alert>
        </Container>
      )}
      <SimpleGrid cols={{ base: 1, sm: 3, lg: 5 }}>
        {sellOrders.map((order, index) => (
          <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
            <Card.Section>
              <Image
                src={order.image}
                height={160}
                alt="No image"
              />
            </Card.Section>
            <Group justify="space-between" mt="md" mb="xs">
              <Text fw={500}>{`${order.name} #${order.parameters.offer[0].identifierOrCriteria}`}</Text>
              <Badge color="red" variant="light">
                tokenId: {order.parameters.offer[0].identifierOrCriteria}
              </Badge>
            </Group>
            <Group mt="xs" mb="xs">
              <IconUser size="2rem" stroke={1.5} />
              <Text size="md" c="dimmed">
                {order.parameters.consideration[0].recipient.slice(0, 6) + '...' + order.parameters.consideration[0].recipient.slice(-2)}
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              {order.description}
            </Text>
            <Group mt="xs" mb="xs">
              {/* <Text fz="lg" fw={700}> 
                {`Price: ${ethersV5.utils.parseEther((order.parameters.consideration[0].startAmount))} ether`}
              </Text> */}
              <Button
                variant="light"
                color="blue"
                mt="xs"
                radius="xl"
                style={{ flex: 1 }}
                onClick={() => { setSelectedOrder(order); open(); }}
              >
                Request Exchange
              </Button>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <Modal opened={opened} onClose={close} title="Select your NFT for Exchange">
        <Stack>
          {myNFTs.map((nft, index) => (
            <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
              <Card.Section>
                <Image src={nft.image} height={160} alt="No image" />
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
                onClick={() => { requestExchange(nft); }}
              >
                Select this NFT
              </Button>
            </Card>
          ))}
        </Stack>
      </Modal>
    </div>
  );
}  