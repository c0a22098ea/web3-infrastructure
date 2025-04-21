# IPFSを用いたweb3-app
本デモアプリケーションは、web3アプリケーションのNFTデータとそのメタデータをIPFSに保存し、データの完全性を担保する。また、処理が失敗した場合には、ブロックチェーンとIPFSの両方で行われた処理をキャンセルし、処理前の状態に戻す機能を実装しています。

## IPFSのSetup
### Installation Steps
go-ipfsのインストール。すでにインストール済みの場合は次のステップに進む。詳しいインストール方法は[IPFS入門](https://ipfs-book.decentralized-web.jp/install_ipfs/)を参考にする

```bash
$ wget https://dist.ipfs.io/go-ipfs/vX.X.X/go-ipfs_vX.X.X_linux-amd64.tar.gz    #URLは、環境やバージョンにより適宜変更してください。
$ tar xvzf go-ipfs_vX.X.X_linux-amd64.tar.gz
$ cd go-ipfs/
$ sudo ./install.sh
```
ipfs versionコマンドを実行しバージョン情報が表示されば問題なくインストールができている。

```bash
$ ipfs version
ipfs version x.x.x
```

### 付録
go-ipfsのアップデート
新しいバージョンのgo-ipfsにアップデートする場合も、インストールと同じように新しいバージョンのモジュールに変更することでアップデートすことができる。

### go-ipfsリポジトリの初期化
go-ipfsのインストールが終了したら、IPFSのP2Pネットワークに参加するために下記のコマンドを実行してローカルのIPFSリポジトリを初期化する。
```bash
$ ipfs init
```
これにより、ユーザのhomeディレクトリ直下に.ipfsディレクトリが生成される。このディレクトリがIPFSのリポジトリとなる。

## private IPFS
プライベートIPFSネットワークの構築を行う。
各ノードでAPI、Gateway、CORSの設定のため、~/.ipfs/configファイルの修正を行う。これにより、外部の指定した通信を可能にした。

configファイルのAddress部分の要素
* API : 書き込み可能
* Gateway : 読み込み専用
* Access-Control-Allow-Origin : アクセス制御許可の設定

```bash
~/.ipfs/config
"API": "/ip4/x.x.x.x/tcp/ポート",
"Gateway": "/ip4/x.x.x.x/tcp/ポート"
```

```bash
~/.ipfs/config
"Access-Control-Allow-Origin": [
      "http://x.x.x.x:ポート",
      "http://x.x.x.x:ポート",
      "http://x.x.x.x:ポート"
    ]
```

### 秘密鍵の生成と配備
プライベートIPFSネットワークに参加するノードが共有で保持する秘密鍵の生成と配備を行う。秘密鍵を作成するのにswarm.keyを作成する
```bash
go install github.com/Kubuxu/go-ipfs-swarm-key-gen/ipfs-swarm-key-gen@latest
ipfs-swarm-key-gen > ~/.ipfs/swarm.key
# 二行目は環境によってパスが変わるので要注意
scp ~/.ipfs/swarm.key アカウント名@x.x.x.x:~/.ipfs/ #送りたいIPFSに配備する
```
### bootstrapノードの設定
bootstrapノードとは、IPFSノード起動時に通信接続を試みるノードのことである。

0.既存のbootstrapを削除する。これにより ipfs initで初期化されたbootstrapが削除される
```bash
ipfs bootstrap rm --all
```

1.次にbootstrapノードの設定を行う。
```bash
ipfs bootstrap add /ip4/x.x.x.x/tcp/ポート/p2p/ipfsのpeerID
```

### IPFSの起動
```bash
ipfs daemon
```