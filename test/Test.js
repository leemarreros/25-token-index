const truffleAssert = require("truffle-assertions");
require("chai").use(require("chai-as-promised")).should();

let FI25 = artifacts.require("./FI25.sol");
let Zero = "0x0000000000000000000000000000000000000000";

contract("FI25", (accounts) => {
  let Owner, Alice, Bob, Carlos, Damian, Evert;
  Owner = accounts[0];
  Alice = accounts[1];
  Bob = accounts[2];
  Carlos = accounts[3];
  Damian = accounts[4];
  Evert = accounts[5];
  Fucci = accounts[6];

  let name = "FIDIS FI25 Crypto Index";
  let symbol = "FI25";
  let decimals = 8;
  let _minTxAmount = 100;
  let fi25;

  // amout with decimals
  function _awd(amount) {
    return amount * 10 ** decimals;
  }

  // calculate fee
  function getFee(amount) {
    return amount / 100;
  }

  xdescribe("Deploy and Mint:", () => {
    before(async () => {
      fi25 = await FI25.new();
    });

    it("Token metada data is correct", async () => {
      let _name = await fi25.name();
      let _symbol = await fi25.symbol();
      let _decimals = await fi25.decimals();
      assert.equal(name, _name, "Token name does not match");
      assert.equal(symbol, _symbol, "Token symbol does not match");
      assert.equal(
        decimals.toString(),
        _decimals,
        "Token decimals does not match"
      );
    });

    it("Minting and final balances are correct.", async () => {
      let lendTx;
      let AliceAmount = _awd(100000);
      lendTx = await fi25.increaseTokenSupply(Alice, AliceAmount, {
        from: Owner,
      });

      let BobAmount = _awd(500000);
      lendTx = await fi25.increaseTokenSupply(Bob, BobAmount, {
        from: Owner,
      });

      // Testing total supply
      let supply = await fi25.totalSupply();
      assert.equal(
        supply.toString(),
        String(AliceAmount + BobAmount),
        "Total supply created does not match minted amount."
      );

      // Testing balances after delivery
      let AliceBalance = await fi25.balanceOf(Alice);
      let BobBalance = await fi25.balanceOf(Bob);
      let OwnerBalance = await fi25.balanceOf(Owner);
      assert.equal(
        AliceBalance,
        AliceAmount,
        "Amount delivered do not match with received"
      );
      assert.equal(
        BobBalance,
        BobAmount,
        "Amount delivered do not match with received"
      );
      assert.equal(
        OwnerBalance,
        0,
        "Amount delivered do not match with received"
      );
    });

    it("Burning and final balances are correct.", async () => {
      let lendTx;
      let previousSupply = await fi25.totalSupply();

      let AliceAmount = _awd(100000 / 2);
      lendTx = await fi25.reduceTokenSupply(Alice, AliceAmount, {
        from: Owner,
      });

      let BobAmount = _awd(500000 / 2);
      lendTx = await fi25.reduceTokenSupply(Bob, BobAmount, {
        from: Owner,
      });

      // Testing total supply
      let supply = await fi25.totalSupply();
      assert.equal(
        (previousSupply - AliceAmount - BobAmount).toString(),
        supply.toString(),
        "Total supply after burned do not match."
      );

      // Testing balances after delivery
      let AliceBalance = await fi25.balanceOf(Alice);
      let BobBalance = await fi25.balanceOf(Bob);
      let OwnerBalance = await fi25.balanceOf(Owner);
      assert.equal(
        AliceBalance,
        AliceAmount,
        "Amount reduced do not match burned."
      );
      assert.equal(
        BobBalance,
        BobAmount,
        "Amount reduced do not match burned."
      );
      assert.equal(OwnerBalance, 0, "Owner should not be affected.");
    });
  });

  xdescribe("Transfer: ", () => {
    before(async () => {
      fi25 = await FI25.new();
      let lendTx;
      let OwnerAmount = _awd(100000);
      lendTx = await fi25.increaseTokenSupply(Owner, OwnerAmount, {
        from: Owner,
      });
    });

    it("From owner to holders - balances and events", async () => {
      let previousSupply = await fi25.totalSupply();

      let OwnerAmount = _awd(100000);
      assert.equal(
        OwnerAmount.toString(),
        previousSupply.toString(),
        "Tokens amount minted to owners incorrect"
      );

      let AliceAmount = OwnerAmount / 2;
      await fi25.transfer(Alice, AliceAmount, { from: Owner });
      let AliceBalance = await fi25.balanceOf(Alice);
      assert.equal(
        AliceAmount,
        AliceBalance,
        "Owner should not pay a transfer fee."
      );

      await truffleAssert.reverts(
        fi25.transfer(Bob, OwnerAmount, { from: Owner }),
        "ERC20: transfer amount exceeds balance"
      );

      await truffleAssert.reverts(
        fi25.transfer(Zero, OwnerAmount / 2, { from: Owner }),
        "ERC20: transfer to the zero address"
      );

      await truffleAssert.reverts(
        fi25.transfer(fi25.address, OwnerAmount / 2, { from: Owner }),
        "ERC20: transfer to the contract's address"
      );

      let BobAmount = OwnerAmount / 2;
      let transferToBob = await fi25.transfer(Bob, BobAmount, { from: Owner });
      let BobBalance = await fi25.balanceOf(Bob);
      assert.equal(
        BobAmount,
        BobBalance,
        "Owner should not pay a transfer fee."
      );

      let evTransferName = "Transfer";
      let evTransfer = [...transferToBob.logs].filter(
        (ev) => ev.event == evTransferName
      );

      assert.equal(
        evTransfer[0].event,
        evTransferName,
        "Transfer event name does not match."
      );

      expect(evTransfer[0].args.from).not.equal(Zero);

      assert.equal(
        evTransfer[0].args.to,
        Bob,
        "Receiver is not the one targeted."
      );
      assert.equal(
        evTransfer[0].args.value.toString(),
        BobAmount,
        "Receiver did not received amount sent."
      );

      let supply = await fi25.totalSupply();
      assert.equal(
        supply.toString(),
        previousSupply.toString(),
        "Supply amout should not change"
      );

      let OwnerBalance = await fi25.balanceOf(Owner);
      assert.equal(
        OwnerBalance,
        (0).toString(),
        "Owner should have delivered all his tokens."
      );

      // excluded account could transfer less than minimum amount 200
      let lessThanMinimum = _minTxAmount - 1;
      await fi25.increaseTokenSupply(Owner, lessThanMinimum, { from: Owner });
      await fi25.transfer(Carlos, lessThanMinimum, { from: Owner });
      let CarlosBalance = await fi25.balanceOf(Carlos);
      assert.equal(
        CarlosBalance,
        lessThanMinimum.toString(),
        "Carlos should have received less than minimum sent by owner."
      );
    });

    it("Between holders - balances and events", async () => {
      let previousSupply = await fi25.totalSupply();
      let OwnerAmount = _awd(100000);
      let AliceAmount = _awd(100000) / 2;

      // Alice sends more than she has
      await truffleAssert.reverts(
        fi25.transfer(Bob, OwnerAmount, {
          from: Alice,
        }),
        "ERC20: transfer amount exceeds balance"
      );

      // Alice sends money to Bob
      let Alice2BobAmount = _awd(1000);
      let feeAlice2BobAmount = getFee(Alice2BobAmount);
      let BobBalancePrevious = await fi25.balanceOf(Bob);
      let txAliceToBob = await fi25.transfer(Bob, Alice2BobAmount, {
        from: Alice,
      });
      let BobBalance = await fi25.balanceOf(Bob);
      assert.equal(
        BobBalance.toString(),
        String(
          Number(BobBalancePrevious.toString()) +
            (Alice2BobAmount - feeAlice2BobAmount)
        ),
        "Receiver got incorrect amount of tokens."
      );
      let AliceBalance = await fi25.balanceOf(Alice);
      assert.equal(
        String(AliceAmount - Alice2BobAmount),
        AliceBalance.toString(),
        "Sender delivered incorrect amount of tokens."
      );
      let OwnerBalance = await fi25.balanceOf(Owner);
      assert.equal(
        feeAlice2BobAmount.toString(),
        OwnerBalance.toString(),
        "Owner received incorrect amount of tokens."
      );

      let supply = await fi25.totalSupply();
      assert.equal(
        previousSupply.toString(),
        supply.toString(),
        "Total supply should not change."
      );

      // Alice sends less than minimum amount
      await truffleAssert.reverts(
        fi25.transfer(Bob, _minTxAmount - 1, { from: Alice }),
        "Transfer amount must be greater than 200"
      );

      // Transfer events
      let evTransferName = "Transfer";
      let evTransfer = [...txAliceToBob.logs].filter(
        (ev) => ev.event == evTransferName
      );

      assert.equal(
        evTransfer[0].event,
        evTransferName,
        "Transfer event name does not match."
      );

      expect(evTransfer[0].args.from).equal(Alice);

      assert.equal(
        evTransfer[0].args.to,
        Bob,
        "Receiver is not the one targeted."
      );
      assert.equal(
        evTransfer[0].args.value.toString(),
        Alice2BobAmount.toString(),
        "Receiver did not received amount sent."
      );
    });
  });

  xdescribe("Voting: ", () => {
    beforeEach(async () => {
      fi25 = await FI25.new();
    });

    xit("Add up to three owners in total and remove up to two", async () => {
      let isOwner;
      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Carlos);
      assert.equal(isOwner, false, "Should not be an Owner");

      await truffleAssert.reverts(
        fi25.addNewOwner(Alice, { from: Alice }),
        "Owned: caller is not an owner"
      );

      await fi25.addNewOwner(Alice, { from: Owner });
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, true, "Should be an Owner");

      await truffleAssert.reverts(
        fi25.addNewOwner(Alice, { from: Alice }),
        "Owned: account is already an owner"
      );

      await truffleAssert.reverts(
        fi25.addNewOwner(Zero, { from: Alice }),
        "Owned: cannot be a zero address"
      );

      await truffleAssert.reverts(
        fi25.addNewOwner(Bob, { from: Bob }),
        "Owned: caller is not an owner"
      );

      await fi25.addNewOwner(Bob, { from: Alice });
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, true, "Should be an Owner");

      await truffleAssert.reverts(
        fi25.addNewOwner(Carlos, { from: Bob }),
        "Owned: amount of owners equal and less than three"
      );

      // REMOVING OWNERS
      await fi25.removeOwner(Bob, { from: Alice });
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, false, "Should not be an Owner");

      await truffleAssert.reverts(
        fi25.removeOwner(Bob, { from: Alice }),
        "Owned: account is not owner"
      );

      await fi25.removeOwner(Alice, { from: Owner });
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, false, "Should not be an Owner");

      await truffleAssert.reverts(
        fi25.removeOwner(Alice, { from: Owner }),
        "Owned: account is not owner"
      );

      await truffleAssert.reverts(
        fi25.removeOwner(Owner, { from: Owner }),
        "Owned: owner cannot remove himself"
      );
    });

    xit("Transfer ownership between one or two other owners - no multisign enabled", async () => {
      let isOwner;
      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Carlos);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Damian);
      assert.equal(isOwner, false, "Should not be an Owner");

      await truffleAssert.reverts(
        fi25.transferOwnership(Owner, { from: Owner }),
        "Owned: New owner is the same as caller"
      );
      await truffleAssert.reverts(
        fi25.transferOwnership(Zero, { from: Owner }),
        "Owned: Address cannot be zero"
      );
      await truffleAssert.reverts(
        fi25.transferOwnership(fi25.address, { from: Owner }),
        "Owned: Address cannot be contract's address"
      );

      let tokens = _awd(1000000);
      await fi25.increaseTokenSupply(Owner, tokens, { from: Owner });
      let OwnerBalance = await fi25.balanceOf(Owner);
      assert.equal(
        String(tokens),
        OwnerBalance.toString(),
        "Amount delivered do not match with received"
      );

      // add a new owner
      await fi25.addNewOwner(Alice, { from: Owner });
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, true, "Should be an Owner");

      // transfering ownership
      await truffleAssert.reverts(
        fi25.transferOwnership(Alice, { from: Owner }),
        "Owned: New owner is already owner"
      );
      let _commissionHolder;
      _commissionHolder = await fi25.commissionHolder({ from: Owner });
      assert.equal(_commissionHolder, Owner, "Commission owner is not correct");

      await fi25.transferOwnership(Bob, { from: Owner });
      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, true, "Should be an Owner");

      _commissionHolder = await fi25.commissionHolder({ from: Bob });
      assert.equal(_commissionHolder, Bob, "Commission owner is not correct");

      let BobBalance = await fi25.balanceOf(Bob);
      assert.equal(
        String(tokens),
        BobBalance.toString(),
        "Amount delivered do not match with received"
      );
      OwnerBalance = await fi25.balanceOf(Owner);
      assert.equal(
        String(0),
        OwnerBalance.toString(),
        "Amount delivered do not match with received"
      );
      OwnerBalance = await fi25.balanceOf(Alice);
      assert.equal(
        String(0),
        OwnerBalance.toString(),
        "Amount delivered do not match with received"
      );

      await fi25.transferOwnership(Carlos, { from: Bob });
      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Carlos);
      assert.equal(isOwner, true, "Should be an Owner");

      OwnerBalance = await fi25.balanceOf(Carlos);
      assert.equal(
        String(tokens),
        OwnerBalance.toString(),
        "Amount delivered do not match with received"
      );
      OwnerBalance = await fi25.balanceOf(Bob);
      assert.equal(
        String(0),
        OwnerBalance.toString(),
        "Amount delivered do not match with received"
      );
      OwnerBalance = await fi25.balanceOf(Alice);
      assert.equal(
        String(0),
        OwnerBalance.toString(),
        "Amount delivered do not match with received"
      );
      OwnerBalance = await fi25.balanceOf(Owner);
      assert.equal(
        String(0),
        OwnerBalance.toString(),
        "Amount delivered do not match with received"
      );

      _commissionHolder = await fi25.commissionHolder({ from: Alice });
      assert.equal(
        _commissionHolder,
        Carlos,
        "Commission owner is not correct"
      );

      await fi25.transferOwnership(Damian, { from: Alice });
      isOwner = await fi25.isOwner(Damian);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, false, "Should not be an Owner");

      _commissionHolder = await fi25.commissionHolder({ from: Damian });
      assert.equal(
        _commissionHolder,
        Carlos,
        "Commission owner is not correct"
      );

      OwnerBalance = await fi25.balanceOf(Damian);
      assert.equal(
        String(0),
        OwnerBalance.toString(),
        "Amount delivered do not match with received"
      );
    });

    xit("Setting account as commission holder - no multisign enabled", async () => {
      let isOwner;
      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Carlos);
      assert.equal(isOwner, false, "Should not be an Owner");

      let _commissionHolder;
      _commissionHolder = await fi25.commissionHolder({ from: Owner });
      assert.equal(_commissionHolder, Owner, "Commission owner is not correct");

      await truffleAssert.reverts(
        fi25.setAccountAsCommissionHolder(Alice, { from: Owner }),
        "Owned: account must be one of the current owners."
      );
      await truffleAssert.reverts(
        fi25.setAccountAsCommissionHolder(Zero, { from: Owner }),
        "Owned: account cannot be zero address."
      );
      await truffleAssert.reverts(
        fi25.setAccountAsCommissionHolder(Owner, { from: Owner }),
        "Owned: account is commission holder."
      );

      await fi25.addNewOwner(Alice, { from: Owner });
      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, true, "Should be an Owner");

      await fi25.setAccountAsCommissionHolder(Alice, { from: Owner });
      _commissionHolder = await fi25.commissionHolder({ from: Owner });
      assert.equal(_commissionHolder, Alice, "Commission owner is not correct");
      _commissionHolder = await fi25.commissionHolder({ from: Alice });
      assert.equal(_commissionHolder, Alice, "Commission owner is not correct");

      let lendTx;
      let AliceAmount = _awd(100000);
      lendTx = await fi25.increaseTokenSupply(Alice, AliceAmount, {
        from: Owner,
      });
      let AliceBalance = await fi25.balanceOf(Alice);
      assert.equal(
        AliceBalance.toString(),
        String(AliceAmount),
        "Amount delivered do not match with received"
      );

      await fi25.addNewOwner(Bob, { from: Owner });
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, true, "Should be an Owner");

      await fi25.setAccountAsCommissionHolder(Bob, { from: Alice });
      _commissionHolder = await fi25.commissionHolder({ from: Owner });
      assert.equal(_commissionHolder, Bob, "Commission owner is not correct");
      let BobBalance = await fi25.balanceOf(Bob);
      assert.equal(
        BobBalance.toString(),
        String(AliceAmount),
        "Amount delivered do not match with received"
      );
    });

    it("Commission fees are deposited - no multisign enabled", async () => {
      let isOwner;
      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, false, "Should not be an Owner");
      isOwner = await fi25.isOwner(Carlos);
      assert.equal(isOwner, false, "Should not be an Owner");

      let _commissionHolder;
      _commissionHolder = await fi25.commissionHolder({ from: Owner });
      assert.equal(_commissionHolder, Owner, "Commission owner is not correct");
      let OwnerBalance = await fi25.balanceOf(Owner);
      assert.equal(
        OwnerBalance.toString(),
        String(0),
        "Amount delivered do not match with received"
      );

      let AliceAmount = _awd(100000);
      await fi25.increaseTokenSupply(Alice, AliceAmount, { from: Owner });
      let AliceBalance;
      AliceBalance = await fi25.balanceOf(Alice);
      assert.equal(
        AliceBalance.toString(),
        String(AliceAmount),
        "Amount delivered do not match with received"
      );
      let BobAmount = AliceAmount / 2;
      let fee = getFee(BobAmount);
      await fi25.transfer(Bob, BobAmount, { from: Alice });
      AliceBalance = await fi25.balanceOf(Alice);
      assert.equal(
        AliceBalance.toString(),
        String(BobAmount),
        "Balance after delivery do not match with sent"
      );
      let BobBalance;
      BobBalance = await fi25.balanceOf(Bob);
      assert.equal(
        BobBalance.toString(),
        String(BobAmount - fee),
        "Amount delivered minus fee is not correct"
      );
      OwnerBalance = await fi25.balanceOf(Owner);
      assert.equal(
        OwnerBalance.toString(),
        String(fee + 1),
        "Commission fee received is incorrect."
      );
    });
  });

  describe("Multisign: ", () => {
    beforeEach(async () => {
      fi25 = await FI25.new();
    });

    xit("Add up to three owners in total and remove up to two - no multisign enabled", async () => {
      let isOwner;
      let multisigStatus;
      multisigStatus = await fi25._multisigEnabled();
      assert.equal(multisigStatus, false, "Multisig should not be enabled");

      await fi25.enableMultisig();
      multisigStatus = await fi25._multisigEnabled();
      assert.equal(multisigStatus, true, "Multisig should be enabled");

      await truffleAssert.reverts(
        fi25.vote({ from: Owner }),
        "Owned: voting requires > 1 and <=3 owners"
      );

      await fi25.addNewOwner(Alice, { from: Owner });
      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, true, "Should be an Owner");
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, true, "Should be an Owner");

      // cannot vote if topic is not set
      await truffleAssert.reverts(
        fi25.vote({ from: Owner }),
        "Owned: must set topic prior voting"
      );

      // cannot addNewOwner until _multisigApprovalGiven is true
      await truffleAssert.reverts(
        fi25.addNewOwner(Bob, { from: Owner }),
        "Multisig Error: You do not meet the multisignature requirements"
      );
      let topic;
      await fi25.setTopic("ADD_NEW_OWNER", { from: Owner });
      topic = await fi25._topic();
      assert.equal(topic, "ADD_NEW_OWNER", "Topic was not set properly");

      await truffleAssert.reverts(
        fi25.setTopic("DISABLE_MULTISIGN", { from: Owner }),
        "Multisign Error: Topic cannot be changed during a pending vote."
      );

      // cannot addNewOwner until there are two votes
      let multi = await fi25._multisigEnabled();
      assert.equal(multi, true, "Multisign enabled should be true");
      let amoutOwners = await fi25._amountOwners();
      assert.equal(
        amoutOwners.toString(),
        String(2),
        "Amount of owners is not correct"
      );
      let multiApproval;
      multiApproval = await fi25._multisigApprovalGiven();
      assert.equal(multiApproval, false, "Multisig should not be enabled");

      await truffleAssert.reverts(
        fi25.addNewOwner(Bob, { from: Owner }),
        "Multisig Error: You do not meet the multisignature requirements"
      );

      await fi25.vote({ from: Owner });
      await fi25.vote({ from: Alice });
      multiApproval = await fi25._multisigApprovalGiven();
      assert.equal(multiApproval, true, "Multisig should be enabled");

      await fi25.addNewOwner(Bob, { from: Owner });
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, true, "Should be an Owner");

      // after voting
      multiApproval = await fi25._multisigApprovalGiven();
      assert.equal(multiApproval, false, "Multisig should not be enabled");
      amoutOwners = await fi25._amountOwners();
      assert.equal(
        amoutOwners.toString(),
        String(3),
        "Amount of owners is not correct"
      );
      topic = await fi25._topic();
      assert.equal(topic, "", "Topic was not reset properly");

      await truffleAssert.reverts(
        fi25.addNewOwner(Bob, { from: Owner }),
        "Multisig Error: You do not meet the multisignature requirements"
      );
      await truffleAssert.reverts(
        fi25.vote({ from: Owner }),
        "Owned: must set topic prior voting"
      );

      // there are three owners
      // two of them will vote
      await truffleAssert.reverts(
        fi25.setTopic("ADD_NEW_OWNER", { from: Owner }),
        "Multisign: Cannot call this topic with >= 3 owners."
      );

      // Removing an owner from 3
      await truffleAssert.reverts(
        fi25.removeOwner(Bob, { from: Owner }),
        "Multisig Error: You do not meet the multisignature requirements"
      );
      await fi25.setTopic("REMOVE_OWNER", { from: Owner });
      await fi25.vote({ from: Alice });
      await fi25.vote({ from: Bob });
      await fi25.vote({ from: Owner });
      await fi25.removeOwner(Bob, { from: Owner });
      isOwner = await fi25.isOwner(Bob);
      assert.equal(isOwner, false, "Should not be an Owner");

      //Removeing an owner of 2
      await truffleAssert.reverts(
        fi25.removeOwner(Alice, { from: Owner }),
        "Multisig Error: You do not meet the multisignature requirements"
      );
      await fi25.setTopic("REMOVE_OWNER", { from: Owner });
      await fi25.vote({ from: Alice });
      await fi25.vote({ from: Owner });
      await fi25.removeOwner(Alice, { from: Owner });
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, false, "Should not be an Owner");
    });

    xit("DISABLE_MULTISIGN", async () => {
      let multisigStatus;
      multisigStatus = await fi25._multisigEnabled();
      assert.equal(multisigStatus, false, "Multisig should not be enabled");

      await fi25.enableMultisig();
      multisigStatus = await fi25._multisigEnabled();
      assert.equal(multisigStatus, true, "Multisig should be enabled");

      await fi25.addNewOwner(Alice, { from: Owner });
      await fi25.setTopic("DISABLE_MULTISIGN", { from: Owner });
      await fi25.vote({ from: Alice });
      await fi25.vote({ from: Owner });
      await fi25.disableMultisig({ from: Owner });

      multisigStatus = await fi25._multisigEnabled();
      assert.equal(multisigStatus, false, "Multisig should not be enabled");
    });

    xit("PAUSE - UNPAUSE", async () => {
      let multisigStatus;
      multisigStatus = await fi25._multisigEnabled();
      assert.equal(multisigStatus, false, "Multisig should not be enabled");

      let pauseStatus = await fi25.paused();
      assert.equal(pauseStatus, false, "Paused should be false");

      await fi25.addNewOwner(Alice, { from: Owner });
      await fi25.addNewOwner(Bob, { from: Alice });

      await fi25.enableMultisig();
      multisigStatus = await fi25._multisigEnabled();
      assert.equal(multisigStatus, true, "Multisig should be enabled");

      await fi25.setTopic("PAUSE", { from: Owner });
      await fi25.vote({ from: Alice });
      await fi25.vote({ from: Bob });
      await fi25.vote({ from: Owner });
      await fi25.pause({ from: Owner });

      pauseStatus = await fi25.paused();
      assert.equal(pauseStatus, true, "Paused should be true");

      await truffleAssert.reverts(
        fi25.pause({ from: Owner }),
        "Pausable: Contract is paused"
      );

      await fi25.setTopic("UNPAUSE", { from: Owner });
      await fi25.vote({ from: Alice });
      await fi25.vote({ from: Bob });
      await fi25.vote({ from: Owner });
      await fi25.unpause({ from: Owner });

      pauseStatus = await fi25.paused();
      assert.equal(pauseStatus, false, "Paused should be true");
    });

    xit("TRANSFER_OWNERSHIP", async () => {
      await fi25.addNewOwner(Alice, { from: Owner });
      await fi25.addNewOwner(Bob, { from: Alice });

      await fi25.enableMultisig();
      multisigStatus = await fi25._multisigEnabled();
      assert.equal(multisigStatus, true, "Multisig should be enabled");

      await fi25.setTopic("TRANSFER_OWNERSHIP", { from: Owner });
      await fi25.vote({ from: Alice });
      await fi25.vote({ from: Bob });
      await fi25.vote({ from: Owner });
      await fi25.transferOwnership(Carlos, { from: Alice });

      let isOwner;
      isOwner = await fi25.isOwner(Alice);
      assert.equal(isOwner, false, "Should be an Owner");
      isOwner = await fi25.isOwner(Carlos);
      assert.equal(isOwner, true, "Should be an Owner");

      // with commission holder
      await fi25.setTopic("TRANSFER_OWNERSHIP", { from: Owner });
      await fi25.vote({ from: Carlos });
      await fi25.vote({ from: Bob });
      await fi25.transferOwnership(Damian, { from: Owner });

      isOwner = await fi25.isOwner(Owner);
      assert.equal(isOwner, false, "Should be an Owner");
      isOwner = await fi25.isOwner(Damian);
      assert.equal(isOwner, true, "Should be an Owner");

      let _commissionHolder;
      _commissionHolder = await fi25._commissionHolder();
      assert.equal(
        _commissionHolder,
        Damian,
        "Commission owner is not correct"
      );
    });

    xit("SET_COMMISSION_HOLDER", async () => {
      await fi25.addNewOwner(Alice, { from: Owner });
      await fi25.addNewOwner(Bob, { from: Alice });

      await fi25.enableMultisig();
      multisigStatus = await fi25._multisigEnabled();
      assert.equal(multisigStatus, true, "Multisig should be enabled");

      await fi25.setTopic("SET_COMMISSION_HOLDER", { from: Owner });
      await fi25.vote({ from: Alice });
      await fi25.vote({ from: Bob });
      await fi25.vote({ from: Owner });
      await fi25.setAccountAsCommissionHolder(Alice, { from: Bob });

      let _commissionHolder;
      _commissionHolder = await fi25._commissionHolder();
      assert.equal(_commissionHolder, Alice, "Commission owner is not correct");
    });

    it("INCREASE_TOKEN_SUPPLY", async () => {
      await fi25.addNewOwner(Alice, { from: Owner });
      await fi25.addNewOwner(Bob, { from: Alice });

      await fi25.enableMultisig();
      multisigStatus = await fi25._multisigEnabled();
      assert.equal(multisigStatus, true, "Multisig should be enabled");

      await fi25.setTopic("INCREASE_TOKEN_SUPPLY", { from: Owner });
      await fi25.vote({ from: Alice });
      await fi25.vote({ from: Bob });
      await fi25.vote({ from: Owner });
      let AliceAmount = _awd(100000);
      await fi25.increaseTokenSupply(Alice, AliceAmount, { from: Bob });

      let AliceBalance = await fi25.balanceOf(Alice);
      assert.equal(
        AliceBalance.toString(),
        String(AliceAmount),
        "Amount delivered do not match with received"
      );

      await fi25.setTopic("REDUCE_TOKEN_SUPPLY", { from: Owner });
      await fi25.vote({ from: Alice });
      await fi25.vote({ from: Bob });
      await fi25.vote({ from: Owner });
      await fi25.reduceTokenSupply(Alice, AliceAmount, { from: Alice });
      AliceBalance = await fi25.balanceOf(Alice);
      assert.equal(
        AliceBalance.toString(),
        String(0),
        "Amount delivered do not match with received"
      );
    });
    
  });
});
