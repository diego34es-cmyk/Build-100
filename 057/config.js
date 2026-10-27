// 网络与合约地址配置。?net=bscMainnet | bscTestnet | local 切换；默认网络由 defaultNetwork 决定。
window.LAB_CONFIG = {
  defaultNetwork: "bscMainnet",
  networks: {
    bscTestnet: {
      chainId: 97,
      chainIdHex: "0x61",
      name: "BNB Smart Chain Testnet",
      rpc: "https://bsc-testnet-rpc.publicnode.com",
      explorer: "https://testnet.bscscan.com",
      nativeSymbol: "tBNB",
      kind: "testnet",          // local | testnet | mainnet —— 决定顶部标签与横幅
      label: "BNB Chain 测试网",
      contracts: {"LABToken": "0xDF89860271fCF20154bC290B12E2C82975E2d050", "ElementNFT": "0x238b52a03BACE58eA99ac46cB1599DddC826dc46", "NFTStaking": "0x11A0B7b5d7dac63bd9F4327b2d0359D36eA5Eba5", "Synthesis": "0xf1Af67a7c1A27bB8dE90E82F314bf3857929EC9b", "AgentGate": "0x22E22f2560A58BE4A060dD1eFa8d85EcA6461D70"}
    },
    local: {
      chainId: 31337,
      chainIdHex: "0x7a69",
      name: "Anvil Local",
      rpc: "http://127.0.0.1:8545",
      explorer: "",
      nativeSymbol: "ETH",
      kind: "local",
      label: "本地 Anvil 链",
      contracts: {"LABToken": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", "ElementNFT": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", "NFTStaking": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", "Synthesis": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", "AgentGate": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"}
    }
    ,
    bscMainnet: {
      chainId: 56,
      chainIdHex: "0x38",
      name: "BNB Smart Chain",
      rpc: "https://bsc-dataseed.bnbchain.org",
      rpcBatch: 1,              // bsc-dataseed 对 JSON-RPC 批量请求限流，逐条发送
      explorer: "https://bscscan.com",
      nativeSymbol: "BNB",
      kind: "mainnet",
      label: "BNB Chain 主网",
      // 事件日志 (时间线 / 动态回放)：公共 RPC 对 eth_getLogs 限制很严，按顺序回退；span = 单次查询最大区块跨度
      logRpcs: [
        { url: "https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3", span: 49000 },
        { url: "https://bsc.api.pocket.network", span: 4900 },   // 部分后端限 5000 块，超过返回 400
        { url: "https://rpc-bsc.48.club", span: 4900 }
        // 不放 bsc-rpc.publicnode.com：约 20–32 小时前的区块 getLogs 返回空/不全且不报错（2026-10-27 巡检）
      ],
      rpcFallback: ["https://bsc-rpc.publicnode.com", "https://rpc-bsc.48.club"],
      deployBlock: 129324654,   // ElementNFT/Synthesis/NFTStaking 部署区块
      marketBlock: 129327529,   // LabMarket 部署区块
      bidMarketBlock: 129679954, // LabBidMarket（求购）部署区块
      spaceIdRegistry: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F", // SPACE ID .ai handleOf / ownerOfHandle
      // deploy_mainnet.sh 部署后自动填入，并把 defaultNetwork 改为 "bscMainnet"。门禁：SPACE ID Agent ID (.ai)
      contracts: {"LABToken": "0xEF07eA3DebE4bdb583b83B504E094C5da1693a38", "ElementNFT": "0xfE5Ab5ce9b1D86a55d70E7D0573a14D559029C18", "NFTStaking": "0xfB75069413e00EEdB9DB957b767a8cED3b9AE93b", "Synthesis": "0xfc84639AE85b3B8fd49172A153510F02DF79626b", "AgentGate": "0x31B511eAf6b62C4419DAD61484c66971C80C9FA8", "AgentVerifier": "0x6C6b8CeF0b22A07566320C3b57e879dB2c663fC7", "LabMarket": "0xD69e644DD0DbC22cE20448E1F8646D95e097ccDd", "LabBidMarket": "0x6211EEa138F207bF6C6FB04efb1E27252f9246aB"}
    }
  }
};

// 零号元素 / Element Zero（独立 ERC-1155，id 0，总量 100）与它的专用市场（LabMarket 源码原样复制，nft = ElementZero）。
// 按页面网络（?net=）取对应一项；地址留空 = 该网络未上线，网页不显示「零号元素」分页。
window.LAB_EZ_CONFIG = {
  bscMainnet: { ElementZero: "0x69419a9d9E30d04623fbBFf0c3c422DC069f634f", EZMarket: "0x34DcAe4224C7733f39aD34DDa7117C0493540928", block: 129988536 },
  bscTestnet: { ElementZero: "0x4459683D1f721742362ad8FbB37F18C1ce7e58eA", EZMarket: "0xB7dAe9b0f8bdcC3B63261f72E8ACD9a5c3Ec3212", block: 139126288 },
  local: { ElementZero: "", EZMarket: "", block: 0 }
};
