const {
  Connection,
  PublicKey,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Transaction
} = require("@solana/web3.js");
const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer
} = require("@solana/spl-token");
const {
  Metadata,
  CreateMetadataV2,
  CreateMetadataAccountV2Instruction,
  DataV2
} = require("@solana/spl-token-metadata");

const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

// Connect to Solana testnet network
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
//const connection = new Connection("http://localhost:8899", 'confirmed');

// Generate a new wallet keypair and airdrop SOL
const wallet = Keypair.generate();

const airdropSol = async (wallet, amount) => {
  console.log(`Requesting airdrop of ${amount} SOL to ${wallet.publicKey.toBase58()}`);
  const airdropSignature = await connection.requestAirdrop(
      wallet.publicKey,
      amount * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
  console.log(`Airdrop successful: ${airdropSignature}`);
};

const checkBalance = async (wallet) => {
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Current balance of wallet ${wallet.publicKey.toBase58()}: ${balance / LAMPORTS_PER_SOL} SOL`);
  return balance;
};

const main = async () => {
  try {
      console.log(`Starting script...`);

      // Airdrop 2 SOL to the wallet
      await airdropSol(wallet, 2);

      // Check wallet balance
      const balance = await checkBalance(wallet);
      if (balance < 2 * LAMPORTS_PER_SOL) {
          throw new Error('Airdrop failed or insufficient balance.');
      }
      console.log(`Airdropped 2 SOL to ${wallet.publicKey.toBase58()}`);

      console.log(`Creating new SPL token...`);

      // Create new token
      const tokenPublicKey = await createMint(
          connection,
          wallet,
          wallet.publicKey,
          null,
          9 // Number of decimal places
      );

      console.log(`Token created: ${tokenPublicKey.toBase58()}`);

      // Create token account for the wallet to hold the new token
      console.log(`Creating token account for the wallet...`);
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          wallet,
          tokenPublicKey,
          wallet.publicKey
      );
      console.log(`Token Account created: ${tokenAccount.address.toBase58()}`);

      // Mint some tokens to the token account
      console.log(`Minting 1,000,000 tokens to the token account...`);
      await mintTo(
          connection,
          wallet,
          tokenPublicKey,
          tokenAccount.address,
          wallet.publicKey,
          1000000 // Amount of tokens to mint (1,000,000 / 10^9 = 1 token due to 9 decimals)
      );
      console.log(`Minted 1 token to ${tokenAccount.address.toBase58()}`);

      // Generate a new wallet for the recipient
      const recipientWallet = Keypair.generate();
      console.log(`Recipient Wallet Public Key: ${recipientWallet.publicKey.toBase58()}`);

      // Create associated token account for recipient
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          wallet,
          tokenPublicKey,
          recipientWallet.publicKey
      );
      console.log(`Recipient Token Account Address: ${recipientTokenAccount.address.toBase58()}`);

      // Transfer tokens to recipient
      const transferSignature = await transfer(
          connection,
          wallet,
          tokenAccount.address,
          recipientTokenAccount.address,
          wallet.publicKey,
          500000 // Amount of tokens to transfer (500,000 / 10^9 = 0.5 token due to 9 decimals)
      );
      console.log(`Transferred 0.5 token to ${recipientTokenAccount.address.toBase58()}`);
      console.log(`Transfer Transaction Signature: ${transferSignature}`);

  } catch (err) {
      console.error("Error occurred:", err);
      if (err.logs) {
          err.logs.forEach(log => console.log(log));
      }
  }
};

main().catch(err => {
  console.error("Unhandled error:", err);
});
