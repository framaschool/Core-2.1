import { Delegate } from "@packages/core-forger/src/delegate";
import { Application, Container, Contracts } from "@packages/core-kernel";
import { delegates } from "@packages/core-test-framework";
import { KeyPairHolders, Transactions, Utils } from "@packages/crypto";

import { setUp, tearDown } from "../__support__/setup";
import { getActualVoteBalances, getExpectedVoteBalances } from "../__support__/utils";

let app: Application;

beforeAll(async () => {
    app = await setUp();
});

afterAll(async () => {
    await tearDown();
});

test("BlockState handling [unvote], [vote+unvote] blocks", async () => {
    const stateStore = app.get<Contracts.State.StateStore>(Container.Identifiers.StateStore);

    const blockState = app.getTagged<Contracts.State.BlockState>(
        Container.Identifiers.BlockState,
        "state",
        "blockchain",
    );

    const walletRepository = app.getTagged<Contracts.State.WalletRepository>(
        Container.Identifiers.WalletRepository,
        "state",
        "blockchain",
    );

    const unvoteTransaction = Transactions.BuilderFactory.vote()
        .votesAsset([`-${delegates[2].publicKey}`])
        .nonce("3")
        .fee("100")
        .sign(delegates[2].passphrase)
        .build();

    const voteUnvoteTransaction = Transactions.BuilderFactory.vote()
        .votesAsset([`+${delegates[2].publicKey}`, `-${delegates[2].publicKey}`])
        .nonce("4")
        .fee("100")
        .sign(delegates[2].passphrase)
        .build();

    const delegate = new Delegate(KeyPairHolders.Factory.fromBIP39(delegates[1].passphrase));

    const block1 = stateStore.getLastBlock();

    const block2 = delegate.forge([unvoteTransaction.data], {
        timestamp: block1.data.timestamp + 60,
        previousBlock: block1.data,
        reward: Utils.BigNumber.make("100"),
    });

    const block3 = delegate.forge([voteUnvoteTransaction.data], {
        timestamp: block2.data.timestamp + 60,
        previousBlock: block2.data,
        reward: Utils.BigNumber.make("100"),
    });

    expect(getActualVoteBalances(walletRepository)).toEqual(getExpectedVoteBalances(walletRepository));

    await blockState.applyBlock(block2);

    expect(getActualVoteBalances(walletRepository)).toEqual(getExpectedVoteBalances(walletRepository));

    await blockState.applyBlock(block3);

    expect(getActualVoteBalances(walletRepository)).toEqual(getExpectedVoteBalances(walletRepository));

    await blockState.revertBlock(block3);

    expect(getActualVoteBalances(walletRepository)).toEqual(getExpectedVoteBalances(walletRepository));

    await blockState.revertBlock(block2);

    expect(getActualVoteBalances(walletRepository)).toEqual(getExpectedVoteBalances(walletRepository));
});
