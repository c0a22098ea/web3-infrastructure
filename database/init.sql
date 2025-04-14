DROP DATABASE IF EXISTS BCApp_db;

CREATE DATABASE BCApp_db;

SET GLOBAL sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

CREATE TABLE BCApp_db.nfts (
    id int PRIMARY KEY, 
    token_id int, -- トークンID
    nft_name varchar(256),
    nft_url varchar(256), -- nftのメタデータが入っているurl
    nft_description varchar(256),
    nft_image LONGBLOB, -- nftの画像データ
    signer varchar(255) -- 所有者
);


CREATE TABLE BCApp_db.trades (
    id int PRIMARY KEY AUTO_INCREMENT,
    sender varchar(255), -- 交換の為にマーケットに出した人
    sender_token_id int, -- 交換の為にマーケットに出したnft_id
    price int, -- 交換に出すnftの価格
    send_timestamp TIMESTAMP, -- マーケットに出品した時刻
    -- hold_timestamp DATETIME, --　マーケットに出品しておく時刻(保証期間)
    receiver varchar(255), -- マーケットを見て交換する人
    receiver_token_id int, -- マーケットに出ているNFTと交換されたNFTのid
    stat varchar(255) DEFAULT 'listing'
    -- FOREIGN KEY (sender_token_id) REFERENCES BCApp_db.nfts(token_id)  
    -- FOREIGN KEY (receiver_token_id) REFERENCES BCApp_db.nfts(token_id)  
);

CREATE TABLE BCApp_db.orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  offerer VARCHAR(255) NOT NULL,
  zone VARCHAR(255) NOT NULL,
  orderType INT NOT NULL,
  startTime BIGINT NOT NULL,
  endTime BIGINT NOT NULL,
  zoneHash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  totalOriginalConsiderationItems BIGINT NOT NULL,
  conduitKey VARCHAR(255) NOT NULL,
  counter BIGINT NOT NULL,
  signature VARCHAR(255) NOT NULL, -- ここまでOrderWithCounter
  token_id VARCHAR(255),
  name VARCHAR(255),
  description TEXT,
  image VARCHAR(255),
  price DECIMAL(18, 8),
  signer VARCHAR(255),
  status VARCHAR(255) NOT NULL DEFAULT 'listing'
);

CREATE TABLE BCApp_db.order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    itemType INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    identifierOrCriteria VARCHAR(255) NOT NULL,
    startAmount VARCHAR(255) NOT NULL,
    endAmount VARCHAR(255) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE BCApp_db.considerations (
  id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    itemType INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    identifierOrCriteria VARCHAR(255) NOT NULL,
    startAmount VARCHAR(255) NOT NULL,
    endAmount VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);