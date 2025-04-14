"use client"

import { useContext, useEffect, useState } from "react";
import { Button, Card, Group, SimpleGrid, Text, Title, Image, Badge, Container, Alert } from "@mantine/core";
import { ethers, BigNumberish, isError } from "ethers";
import { ethers as ethersV5, BigNumber as BigNumberV5 } from "ethersV5";
import { IconCubePlus, IconUser } from "@tabler/icons-react";
import { Seaport } from "@opensea/seaport-js";
import { Web3SignerContext } from "@/context/web3.context";
import { OrderWithNFTInfo } from "../types";
import axios from "axios";
import { MyERC721, MyERC721__factory } from "@/types";

type NFT = {
  tokenId: string,
  name: string,
  description: string,
  image: string,
};

export default function SellOrders() {
  const { signer } = useContext(Web3SignerContext);
  const [myERC721Contract, setMyERC721Contract] = useState<MyERC721 | null>(null);
  const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
  const [mySeaport, setMySeaport] = useState<Seaport | null>(null);
  const [sellOrders, setSellOrders] = useState<OrderWithNFTInfo[]>([]);
  const [alert, setAlert] = useState<{ color: string, title: string, message: string } | null>(null);

  const fetchSellOrders = async () => {
    console.log("sell ordersを取得するよ");
    try {
      // const response = await axios.get("http://10.203.92.63:8888/get-sell-orders");
      const response = await axios.get("/api/order");
      setSellOrders(response.data);
    } catch (error) {
      console.error('Error fetching sell orders:', error);
    }
  };

  const handleOrderClick = (orderId: number) => {
    window.location.href = `/get-nft/${orderId}`;
  };

  // const fetchMyNFTs = async () => {
  //   const nfts = [];
  //   if (myERC721Contract && myERC721Contract.runner) {
  //     const myAddress = signer?.getAddress()!
  //     let balance = BigInt(0);
  //     try {
  //       balance = await myERC721Contract.balanceOf(myAddress)
  //     } catch (err) {
  //       if (isError(err, "BAD_DATA")) {
  //         balance = BigInt(0);
  //       } else {
  //         throw err;
  //       }
  //     }
  //     for (let i = 0; i < balance; i++) {
  //       const tokenId = await myERC721Contract.tokenOfOwnerByIndex(myAddress, i);
  //       const tokenURI = await myERC721Contract.tokenURI(tokenId);
  //       const response = await fetch(tokenURI);
  //       const jsonMetaData = await response.json();
  //       nfts.push({ tokenId, ...jsonMetaData });
  //     }
  //     setMyNFTs(nfts);
  //   }
  // };

  useEffect(() => {
    fetchSellOrders();
    // fetchMyNFTs();
  }, []);

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

  const buyNft = async (index: number, order: OrderWithNFTInfo) => {
    console.log("NFT取引処理を開始するよ");
    if (!mySeaport) {
      setAlert({ color: 'red', title: 'Failed to buy NFT', message: 'Seaport instance is not initialized' });
      return;
    }

    try {
      const { executeAllActions: executeAllFulfillActions } = await mySeaport!.fulfillOrders({
        fulfillOrderDetails: [{ order }],
        accountAddress: await signer?.getAddress()
      });

      const transaction = await executeAllFulfillActions();
      console.log(transaction);

      // const query = new URLSearchParams({ id: index.toString() });
      // await axios.put("http://10.203.92.63:8888/update-order-status", { orderId: index, status: "completed" });

      setAlert({ color: 'teal', title: 'Success buy NFT', message: 'Now you own the NFT!' });
      fetchSellOrders();
    } catch (error) {
      setAlert({ color: 'red', title: 'Failed to buy NFT', message: (error as { message: string }).message });
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
              <Text fz="lg" fw={700}>
                {`Price: ${((order.price))} ether`}
              </Text>
              <Button
                variant="light"
                color="red"
                mt="xs"
                radius="xl"
                style={{ flex: 1 }}
                onClick={() => { buyNft(index, order); }}
              >
                Buy this NFT
              </Button>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  );
}