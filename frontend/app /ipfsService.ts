import { create, IPFSHTTPClient } from 'ipfs-http-client';
import fs from 'fs';

export class IpfsService {
  static handleUploadToIpfs(file: Express.Multer.File | undefined, nftName: any, nftDescription: any) {
    throw new Error("Method not implemented.");
  }
  ipfs: IPFSHTTPClient | null = null;

  constructor() {}

  connectToIpfs = (multiaddr: string): IPFSHTTPClient | null => {
    try {
      this.ipfs = create({ url: multiaddr });
      const isOnline = this.ipfs.isOnline();
      return isOnline ? this.ipfs : null;
    } catch (error) {
      console.error('Failed to connect to IPFS:', error);
      return null;
    }
  };

  // 画像ファイルをIPFSにアップロードし、CIDを返す関数
  uploadImageToIpfs = async (image: Express.Multer.File): Promise<string> => {
    if (!this.ipfs) {
      throw new Error('IPFS is not connected');
    }
    
    try {
      console.log("upload開始", new Date());
      const { cid } = await this.ipfs.add(image.buffer);
      console.log("upload終わり", new Date());
      return cid.toString();
    } catch (error) {
      console.error('Error uploading image to IPFS:', error);
      throw new Error('Failed to upload image to IPFS');
    }
  };

  // メタデータをJSON形式でIPFSにアップロードし、CIDを返す関数
  uploadMetadataToIpfs = async (metadata: {}): Promise<string> => {
    if (!this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      const { cid } = await this.ipfs.add(JSON.stringify(metadata));
      return cid.toString();
    } catch (error) {
      console.error('Error uploading metadata to IPFS:', error);
      throw new Error('Failed to upload metadata to IPFS');
    }
  };

  getFileFromIpfs = async (cid: string): Promise<string  | undefined > => {
    if (!this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      const stream = this.ipfs.cat(cid);
      let content = '';

      for await (const chunk of stream) {
        content += new TextDecoder().decode(chunk);
      }

      return content;
    } catch (error) {
      console.error('Error retrieving file from IPFS:', error);
      return undefined;
    }
  };

  getIpfsVersion = async (): Promise<Record<string, any> | null> => {
    if (!this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      return await this.ipfs.version();
    } catch (error) {
      console.error('Error getting IPFS version:', error);
      return null;
    }
  };

  getIpfsId = async (): Promise<Record<string, any> | null> => {
    if (!this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      return await this.ipfs.id();
    } catch (error) {
      console.error('Error getting IPFS ID:', error);
      return null;
    }
  };

  publishToTopic = async (topic: string, message: string): Promise<void> => {
    if (!this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      await this.ipfs.pubsub.publish(topic, encodedMessage);
      console.log(`Message "${message}" published to topic "${topic}"`);
    } catch (error) {
      console.error(`Error publishing to topic "${topic}":`, error);
    }
  };

  subscribeToTopic = async (topic: string, onMessage: (msg: string) => void): Promise<void> => {
    if (!this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      await this.ipfs.pubsub.subscribe(topic, (message: any) => {
        const decodedMessage = new TextDecoder().decode(message.data);
        console.log(`Message received on topic "${topic}":`, decodedMessage);
        onMessage(decodedMessage);
      });
      console.log(`Subscribed to topic "${topic}"`);
    } catch (error) {
      console.error(`Error subscribing to topic "${topic}":`, error);
    }
  };

  unsubscribeFromTopic = async (topic: string): Promise<void> => {
    if (!this.ipfs) {
      throw new Error('IPFS is not connected');
    }

    try {
      await this.ipfs.pubsub.unsubscribe(topic);
      console.log(`Unsubscribed from topic "${topic}"`);
    } catch (error) {
      console.error(`Error unsubscribing from topic "${topic}":`, error);
    }
  };


  // /up-ipfsエンドポイントの処理部
  handleUploadToIpfs = async (file: Express.Multer.File, nftName: string, nftDescription: string, connectAddress :string = "/ip4/10.203.92.63/tcp/5001"): Promise<{ success: boolean, metadataHash?: string, message?: string }> => {
    // const connectAddress = "/ip4/10.203.92.63/tcp/5001";
    const ipfs = this.connectToIpfs(connectAddress);

    if (!ipfs) {
      return { success: false, message: "IPFSノードに接続できませんでした" };
    }

    try {
      const fileHash = await this.uploadImageToIpfs(file);
      const url = "http://10.203.92.63:8080/ipfs/" + fileHash;
      const fileMetadata = {
        name: nftName,
        description: nftDescription,
        image: url,
      };
      const metadataHash = await this.uploadMetadataToIpfs(fileMetadata);
      return { success: true, metadataHash };
    } catch (error) {
      console.error("IPFSへのアップロード中にエラーが発生しました", error);
      return { success: false, message: "IPFSへのアップロード中にエラーが発生しました" };
    }
  };

  // /get-ipfsエンドポイントの処理部
  handleGetFromIpfs = async (cid: string): Promise<{ success: boolean, content?: string, message?: string }> => {
    const connectAddress = "/ip4/10.203.92.63/tcp/5001";
    const ipfs = this.connectToIpfs(connectAddress);

    if (!ipfs) {
      return { success: false, message: "IPFSノードに接続できませんでした" };
    }

    try {
      const content = await this.getFileFromIpfs(cid);
      return { success: true, content };
    } catch (error) {
      console.error("IPFSからの取得中にエラーが発生しました", error);
      return { success: false, message: "IPFSからの取得中にエラーが発生しました" };
    }
  };
}
