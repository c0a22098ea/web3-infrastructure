import mysql, { OkPacket, QueryError, RowDataPacket } from "mysql2";
import { OrderWithCounter, OfferItem, ConsiderationItem } from '@opensea/seaport-js/lib/types.js';
import { OrderWithNFTInfo } from "../types.js";

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "attk1010",
  database: "BCApp_db",
});

export class DatabaseService {

  // データベースに注文情報を保存する
  saveOrderToDatabase = async (order: OrderWithNFTInfo, callback: (success: boolean) => void) => {
    console.log("saveOrderToDatabaseの処理が開始されたよ");
    const orderQuery = `
      INSERT INTO orders (offerer, zone, orderType, startTime, endTime, zoneHash, salt, totalOriginalConsiderationItems, conduitKey, counter, signature, token_id, name, description, image, price, signer, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const offerItemsQuery = `
      INSERT INTO order_items (order_id, itemType, token, identifierOrCriteria, startAmount, endAmount)
      VALUES ?
    `;

    const considerationItemsQuery = `
      INSERT INTO considerations (order_id, itemType, token, identifierOrCriteria, startAmount, endAmount, recipient)
      VALUES ?
    `;

    try {
      const signerAddress = order.signer && 'getAddress' in order.signer ? await order.signer.getAddress() : null;

      connection.beginTransaction((err) => {
        if (err) {
          console.error("トランザクションの開始に失敗しました", err);
          callback(false);
          return;
        }

        connection.query(orderQuery, [
          order.parameters.offerer,
          order.parameters.zone,
          order.parameters.orderType,
          order.parameters.startTime,
          order.parameters.endTime,
          order.parameters.zoneHash,
          order.parameters.salt,
          order.parameters.totalOriginalConsiderationItems,
          order.parameters.conduitKey,
          order.parameters.counter,
          order.signature,
          order.tokenId,
          order.name,
          order.description,
          order.image,
          order.price,
          signerAddress,
          "listing"
        ], (orderError: QueryError | null, orderResults: OkPacket) => {
          if (orderError) {
            connection.rollback(() => {
              console.error("オーダー情報の保存中にエラーが発生しました", orderError);
              callback(false);
            });
            return;
          }

          const orderId = orderResults.insertId;

          const saveOfferItems = (callback: (success: boolean) => void) => {
            const offerItems = order.parameters.offer.map((item: OfferItem) => [
              orderId,
              item.itemType,
              item.token,
              item.identifierOrCriteria,
              item.startAmount,
              item.endAmount
            ]);

            connection.query(offerItemsQuery, [offerItems], (offerItemsError: QueryError | null) => {
              if (offerItemsError) {
                connection.rollback(() => {
                  console.error("オファーアイテムの保存中にエラーが発生しました", offerItemsError);
                  callback(false);
                });
                return;
              }
              callback(true);
            });
          };

          const saveConsiderationItems = (callback: (success: boolean) => void) => {
            const considerationItems = order.parameters.consideration.map((item: ConsiderationItem) => [
              orderId,
              item.itemType,
              item.token,
              item.identifierOrCriteria,
              item.startAmount,
              item.endAmount,
              item.recipient
            ]);

            connection.query(considerationItemsQuery, [considerationItems], (considerationItemsError: QueryError | null) => {
              if (considerationItemsError) {
                connection.rollback(() => {
                  console.error("対価アイテムの保存中にエラーが発生しました", considerationItemsError);
                  callback(false);
                });
                return;
              }
              callback(true);
            });
          };

          saveOfferItems((offerSuccess) => {
            if (!offerSuccess) {
              callback(false);
              return;
            }

            saveConsiderationItems((considerationSuccess) => {
              if (!considerationSuccess) {
                callback(false);
                return;
              }

              connection.commit((commitError) => {
                if (commitError) {
                  connection.rollback(() => {
                    console.error("コミット中にエラーが発生しました", commitError);
                    callback(false);
                  });
                  return;
                }

                callback(true);
              });
            });
          });
        });
      });
    } catch (error) {
      console.error("サインアドレスの取得中にエラーが発生しました", error);
      callback(false);
    }
  };



  // 販売状況を変更する
  updateOrderStatus = (orderId: number, status: string, callback: (success: boolean) => void) => {
    const updateQuery = `
      UPDATE orders SET status = ? WHERE id = ?
    `;

    connection.query(updateQuery, [status, orderId], (updateError: QueryError | null, updateResults: OkPacket) => {
      if (updateError) {
        console.error("オーダー情報の更新中にエラーが発生しました", updateError);
        callback(false);
        return;
      }

      callback(true);
    });
  };



  // 注文情報をIDを指定して取得する
  getOrderById = (orderId: number, callback: (order: OrderWithNFTInfo | null) => void) => {
    const orderQuery = `
      SELECT * FROM orders WHERE id = ?
    `;

    const orderItemsQuery = `
      SELECT * FROM order_items WHERE order_id = ?
    `;

    const considerationsQuery = `
      SELECT * FROM considerations WHERE order_id = ?
    `;

    connection.query(orderQuery, [orderId], (orderError, orderResults: RowDataPacket[]) => {
      if (orderError || orderResults.length === 0) {
        console.error("注文情報の取得中にエラーが発生しました", orderError);
        callback(null);
        return;
      }

      const order = orderResults[0];

      connection.query(orderItemsQuery, [orderId], (itemsError, itemsResults: RowDataPacket[]) => {
        if (itemsError) {
          console.error("注文アイテム情報の取得中にエラーが発生しました", itemsError);
          callback(null);
          return;
        }

        connection.query(considerationsQuery, [orderId], (considerationsError, considerationsResults: RowDataPacket[]) => {
          if (considerationsError) {
            console.error("対価情報の取得中にエラーが発生しました", considerationsError);
            callback(null);
            return;
          }

          const offerItems: OfferItem[] = itemsResults.map(item => ({
            itemType: item.itemType,
            token: item.token,
            identifierOrCriteria: item.identifierOrCriteria,
            startAmount: item.startAmount,
            endAmount: item.endAmount
          }));

          const considerationItems: ConsiderationItem[] = considerationsResults.map(item => ({
            itemType: item.itemType,
            token: item.token,
            identifierOrCriteria: item.identifierOrCriteria,
            startAmount: item.startAmount,
            endAmount: item.endAmount,
            recipient: item.recipient
          }));

          const orderWithNFTInfo: OrderWithNFTInfo = {
            tokenId: order.token_id,
            name: order.name,
            description: order.description,
            image: order.image,
            price: order.price,
            signer: order.signer,
            parameters: {
              offerer: order.offerer,
              zone: order.zone,
              orderType: order.orderType,
              startTime: order.startTime,
              endTime: order.endTime,
              zoneHash: order.zoneHash,
              salt: order.salt,
              offer: offerItems,
              consideration: considerationItems,
              totalOriginalConsiderationItems: order.totalOriginalConsiderationItems,
              conduitKey: order.conduitKey,
              counter: order.counter
            },
            signature: order.signature
          };

          callback(orderWithNFTInfo);
        });
      });
    });
  };

  // 出品中の全ての注文情報を取得する
  getAllOrders = (callback: (orders: OrderWithNFTInfo[] | null) => void) => {
    const orderQuery = `
      SELECT * FROM orders WHERE status = 'listing'
    `;

    connection.query(orderQuery, (orderError, orderResults: RowDataPacket[]) => {
      if (orderError || orderResults.length === 0) {
        console.error("注文情報の取得中にエラーが発生しました", orderError);
        callback(null);
        return;
      }

      const orders: OrderWithNFTInfo[] = [];

      const processOrder = (index: number) => {
        if (index >= orderResults.length) {
          callback(orders);
          return;
        }

        const order = orderResults[index];

        const orderItemsQuery = `
          SELECT * FROM order_items WHERE order_id = ?
        `;

        const considerationsQuery = `
          SELECT * FROM considerations WHERE order_id = ?
        `;

        connection.query(orderItemsQuery, [order.id], (itemsError, itemsResults: RowDataPacket[]) => {
          if (itemsError) {
            console.error("注文アイテム情報の取得中にエラーが発生しました", itemsError);
            callback(null);
            return;
          }

          connection.query(considerationsQuery, [order.id], (considerationsError, considerationsResults: RowDataPacket[]) => {
            if (considerationsError) {
              console.error("対価情報の取得中にエラーが発生しました", considerationsError);
              callback(null);
              return;
            }

            const offerItems: OfferItem[] = itemsResults.map(item => ({
              itemType: item.itemType,
              token: item.token,
              identifierOrCriteria: item.identifierOrCriteria,
              startAmount: item.startAmount,
              endAmount: item.endAmount
            }));

            const considerationItems: ConsiderationItem[] = considerationsResults.map(item => ({
              itemType: item.itemType,
              token: item.token,
              identifierOrCriteria: item.identifierOrCriteria,
              startAmount: item.startAmount,
              endAmount: item.endAmount,
              recipient: item.recipient
            }));

            const orderWithNFTInfo: OrderWithNFTInfo = {
              tokenId: order.token_id,
              name: order.name,
              description: order.description,
              image: order.image,
              price: order.price,
              signer: order.signer,
              parameters: {
                offerer: order.offerer,
                zone: order.zone,
                orderType: order.orderType,
                startTime: order.startTime,
                endTime: order.endTime,
                zoneHash: order.zoneHash,
                salt: order.salt,
                offer: offerItems,
                consideration: considerationItems,
                totalOriginalConsiderationItems: order.totalOriginalConsiderationItems,
                conduitKey: order.conduitKey,
                counter: order.counter
              },
              signature: order.signature
            };

            orders.push(orderWithNFTInfo);
            processOrder(index + 1);
          });
        });
      };

      processOrder(0);
    });
  };





  createBuyOrder = (nftId: string, offerNftId: string, buyer: string, callback: (success: boolean) => void) => {
    const query = `
      INSERT INTO buy_orders (nftId, offerNftId, buyer, status)
      VALUES (?, ?, ?, 'pending')
    `;

    connection.query(query, [nftId, offerNftId, buyer], (error: QueryError | null, results: OkPacket) => {
      if (error) {
        console.error("買い注文の作成中にエラーが発生しました", error);
        callback(false);
        return;
      }
      callback(true);
    });
  };

  getBuyOrders = (callback: (orders: any[] | null) => void) => {
    const query = `
      SELECT * FROM buy_orders WHERE status = 'pending'
    `;

    connection.query(query, (error: QueryError | null, results: RowDataPacket[]) => {
      if (error) {
        console.error("買い注文の取得中にエラーが発生しました", error);
        callback(null);
        return;
      }
      callback(results);
    });
  };

  approveBuyOrder = (orderId: number, callback: (success: boolean) => void) => {
    const query = `
      UPDATE buy_orders SET status = 'approved' WHERE id = ?
    `;

    connection.query(query, [orderId], (error: QueryError | null, results: OkPacket) => {
      if (error) {
        console.error("買い注文の承認中にエラーが発生しました", error);
        callback(false);
        return;
      }
      callback(true);
    });
  };

  rejectBuyOrder = (orderId: number, callback: (success: boolean) => void) => {
    const query = `
      UPDATE buy_orders SET status = 'rejected' WHERE id = ?
    `;

    connection.query(query, [orderId], (error: QueryError | null, results: OkPacket) => {
      if (error) {
        console.error("買い注文の拒否中にエラーが発生しました", error);
        callback(false);
        return;
      }
      callback(true);
    });
  };




}