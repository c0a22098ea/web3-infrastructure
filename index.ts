import cors from "cors";
import express, { Application, Request, response, Response } from "express";
import { IpfsService } from "./modules/ipfsService.js";
import multer from "multer";
import mysql, { OkPacket, QueryError, RowDataPacket } from "mysql2";
import { OrderWithCounter, OfferItem, ConsiderationItem } from '@opensea/seaport-js/lib/types.js'
import { ethers } from 'ethers';
import { DatabaseService } from "./modules/datebaseService.js";
import { OrderWithNFTInfo } from "./types.js";


const app: Application = express();
const PORT = 8888;

app.use(cors({ origin: "http://10.203.92.63:3000", credentials: true }));
app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  console.log("getリクエストを受け付けました。");
  res.status(200).json({ message: "hello world" });
});

// IpfsService のインスタンスを作成
const ipfsService = new IpfsService();



// interface fileMetadata {
//   name: String;
//   discription: string;
//   image: string;
// }
const upload = multer();
const databaseService = new DatabaseService();





// app.post("/up-ipfs", upload.single("file"), async (req: Request, res: Response) => {
//   console.log("uploadリクエストを受け付けた");
//   console.log(req.file);
//   console.log("-----");
//   console.log(req.body);
//   const { nftName, nftDescription } = req.body;
//   console.log(nftName, nftDescription);
//   const file = req.file;

//   // IPFSノードの接続
//   try {
//     const ipfsSrevice = new IpfsService();
//     let fileHash: string | null = null;
//     let metadataHash: string | null = null;
//     let fileMetadata: any;

//     // 接続するIPFSノードのアドレス
//     const connectAddress = "/ip4/10.203.92.63/tcp/5001";

//     // IPFSノードの接続
//     const ipfs = await ipfsSrevice.connectToIpfs(connectAddress);

//     if (ipfs) {
//       console.log("IPFSのノードに接続したよ");

//       // 画像データをIPFSにアップロードする
//       if (file) {
//         try {
//           fileHash = await ipfsSrevice.uploadImageToIpfs(file);
//           console.log("fileHashはこの値: ", fileHash);
//         } catch (error) {
//           console.error("Error saving file to IPFS: ", error);
//           res.status(500).json({ message: "画像データをupload出来なかった", success: false });
//         }

//         // メタデータをIPFSにアップロードする
//         const url = "http://10.203.92.63:8080/ipfs/" + fileHash;
//         fileMetadata = {
//           name: nftName,
//           description: nftDescription,
//           image: url,
//         };

//         try {
//           metadataHash = await ipfsSrevice.uploadMetadataToIpfs(fileMetadata);
//           console.log("metadataHashはこの値: ", metadataHash);
//           res.status(200).json({ message: "アップロード成功", success: true, metadataHash: metadataHash });
//         } catch (error) {
//           console.error("メタデータをupload出来なかった", error);
//           res.status(500).json({ message: "メタデータをupload出来なかった", success: false });
//         }
//       } else {
//         console.error("fileが無いよ");
//         res.status(400).json({ message: "ファイルがありません", success: false });
//       }
//     } else {
//       res.status(500).json({ message: "IPFSノードに接続できませんでした", success: false });
//     }
//   } catch (error) {
//     console.error("IPFSの接続中にエラーが発生しました", error);
//     res.status(500).json({ message: "サーバーエラー", success: false });
//   }
// });

app.post("/up-ipfs", upload.single("file"), async (req: Request, res: Response) => {
  console.log("uploadリクエストを受け付けた");
  console.log(req.file);
  console.log("-----");
  console.log(req.body);
  const { nftName, nftDescription } = req.body;
  const file = req.file;

  if (!file) {
    res.status(400).json({ message: "ファイルがありません", success: false });
    return;
  }


  const result = await ipfsService.handleUploadToIpfs(file, nftName, nftDescription);
  if (result.success) {
    console.log(result.metadataHash);
    res.status(200).json({ message: "アップロード成功", success: true, metadataHash: result.metadataHash });
  } else {
    console.log("ここでエラー")
    console.log(result.message);
    res.status(500).json({ message: result.message, success: false });
  }
});

app.get("/get-ipfs/:cid", async (req: Request, res: Response) => {
  const { cid } = req.params;

  const result = await ipfsService.handleGetFromIpfs(cid);
  if (result.success) {
    res.status(200).json({ content: result.content });
  } else {
    res.status(500).json({ message: result.message });
  }
});

app.post("/save-nft", (req: Request, res: Response) => {
  const order: OrderWithNFTInfo = req.body.data;
  // const { tokenId, name, description, image, price, signer } = req.body.data;

  console.log("save-nftリクエストを受け付けました");
  console.log("order: ", order);
  console.log("-----------------");
  console.log(order.parameters.offer);
  console.log(order.parameters.offer[0].itemType);
  console.log("-----------------");
  console.log(order.parameters.consideration);


  // if (!order.tokenId || !order.name || !order.description || !order.image || !order.signer) {
  //   res.status(400).json({ message: "データが不足しています" });
  //   return;
  // }
  databaseService.saveOrderToDatabase(order, (success) => {
    if (success) {
      console.log("オーダー情報が適切に保存された");
      res.status(200).json({message: "オーダー情報が正常に保存されました"});
    } else {
      res.status(500).json({ message: "オーダー情報の保存中にエラーが発生しました" });
    }
  });
});


app.post("/update-order-status", (req: Request, res: Response) => {
  const { orderId, status } = req.body;

  databaseService.updateOrderStatus(orderId, status, (success) => {
    if (success) {
      res.status(200).json({ message: "オーダー情報が正常に更新されました" });
    } else {
      res.status(500).json({ message: "オーダー情報の更新中にエラーが発生しました" });
    }
  });
});



app.get('/get-nft/:id', (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id, 10);

  databaseService.getOrderById(orderId, (order) => {
    if (order) {
      res.status(200).json(order);
    } else {
      res.status(404).json({ message: "注文が見つかりませんでした" });
    }
  });
});

app.get('/get-sell-orders', (req: Request, res: Response) => {
  databaseService.getAllOrders((orders) => {
    if (orders) {
      res.status(200).json(orders);
    } else {
      res.status(500).json({ message: "注文情報の取得中にエラーが発生しました" });
    }
  });
});



app.post('/create-buy-order', (req: Request, res: Response) => {
  const { nftId, offerNftId, buyer } = req.body;

  databaseService.createBuyOrder(nftId, offerNftId, buyer, (success) => {
    if (success) {
      res.status(200).json({ message: "買い注文が作成されました" });
    } else {
      res.status(500).json({ message: "買い注文の作成中にエラーが発生しました" });
    }
  });
});

app.get('/get-buy-orders', (req: Request, res: Response) => {
  databaseService.getBuyOrders((orders) => {
    if (orders) {
      res.status(200).json(orders);
    } else {
      res.status(500).json({ message: "買い注文の取得中にエラーが発生しました" });
    }
  });
});

app.post('/approve-buy-order', (req: Request, res: Response) => {
  const { orderId } = req.body;

  databaseService.approveBuyOrder(orderId, (success) => {
    if (success) {
      res.status(200).json({ message: "買い注文が承認されました" });
    } else {
      res.status(500).json({ message: "買い注文の承認中にエラーが発生しました" });
    }
  });
});

app.post('/reject-buy-order', (req: Request, res: Response) => {
  const { orderId } = req.body;

  databaseService.rejectBuyOrder(orderId, (success) => {
    if (success) {
      res.status(200).json({ message: "買い注文が拒否されました" });
    } else {
      res.status(500).json({ message: "買い注文の拒否中にエラーが発生しました" });
    }
  });
});




try {
  app.listen(PORT, () => {
    console.log(`server running at://localhost:${PORT}`);
  });
} catch (e) {
  if (e instanceof Error) {
    console.error(e.message);
  }
}


