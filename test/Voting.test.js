const Voting = artifacts.require("./Voting");
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract('Voting', accounts => {
  const owner = accounts[0];
  const account2 = accounts[1];
  const account3 = accounts[2];

  let votingInstance;

  const ONLY_VOTER_REVERT = "You're not a voter"
  const ONLY_OWNER_REVERT = "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner."
  const ADD_PROPOSAL_REVERT = "Proposals are not allowed yet"
  const SET_VOTE_REVERT = "Voting session havent started yet"
  const END_PROPOSAL_REGISTERING_REVERT = "Registering proposals havent started yet"
  const START_VOTING_REVERT = "Registering proposals phase is not finished"
  const END_VOTING_REVERT = "Voting session havent started yet"
  const TALLY_VOTE_REVERT = "Current status is not voting session ended"
  const ALREADY_REGISTERED_REVERT = "Already registered"

  describe("Initial state", () => {
    before(async () => {
      votingInstance = await Voting.new({ from: owner });
    });

    it("should have the RegisteringVoters status", async () => {
      const workflowStatus = await votingInstance.workflowStatus();
      expect(workflowStatus).to.be.bignumber.equal(new BN(0));
    });

    it("should have the winningProposalID variable at 0", async () => {
      const winningProposalID = await votingInstance.winningProposalID();
      expect(winningProposalID).to.be.bignumber.equal(new BN(0));
    });
  });

  describe("GetVoter getter", () => {
    before(async () => {
      votingInstance = await Voting.new({ from: owner });
      await votingInstance.addVoter(owner)
    });

    it('should revert if the caller is not a voter', async () => {
      const getVoterPromise = votingInstance.getVoter.call(owner, { from: account2 })
      await expectRevert(getVoterPromise, ONLY_VOTER_REVERT)
    });

    it("should return a non register voter", async () => {
      const voter = await votingInstance.getVoter.call(account2)
      expect(voter.isRegistered).to.be.false;
    });

    it("should return the voter", async () => {
      await votingInstance.addVoter(account2)
      const voter = await votingInstance.getVoter.call(account2)
      expect(voter.isRegistered).to.be.true;
      expect(voter.hasVoted).to.be.false;
      expect(voter.votedProposalId).to.be.bignumber.equal(new BN(0));
    });
  });

  describe("getOneProposal getter", () => {
    before(async () => {
      votingInstance = await Voting.new({ from: owner });
      await votingInstance.addVoter(owner)
      await votingInstance.startProposalsRegistering()
    });

    it("should revert if the caller is not a voter", async () => {
      const getOneProposalPromise = votingInstance.getOneProposal(0, { from: account2 })
      await expectRevert(getOneProposalPromise, ONLY_VOTER_REVERT)
    });

    it("should return the genesis proposal", async () => {
      const expectedDescription = 'GENESIS'
      const proposal = await votingInstance.getOneProposal(0)
      expect(proposal.description).to.be.equal(expectedDescription);
      expect(proposal.voteCount).to.be.bignumber.equal(BN(0));
    });

    it("should return the correct proposal", async () => {
      const descriptionProposal = 'description1'
      await votingInstance.addProposal(descriptionProposal)
      const proposal = await votingInstance.getOneProposal(1)
      expect(proposal.description).to.be.equal(descriptionProposal);
      expect(proposal.voteCount).to.be.bignumber.equal(BN(0));
    });

    it("should revert if the array index does not exist", async () => {
      const getOneProposalPromise = votingInstance.getOneProposal(2);
      await expectRevert.unspecified(getOneProposalPromise)
    });
  });

  describe("RegisteringVoters checks", () => {
    before(async () => {
      votingInstance = await Voting.new({ from: owner });
      await votingInstance.addVoter(owner)
    });

    it("should revert the addProposal call", async () => {
      const addProposalPromise = votingInstance.addProposal('test')
      await expectRevert(addProposalPromise, ADD_PROPOSAL_REVERT)
    });

    it("should revert the setVote call", async () => {
      const setVotePromise = votingInstance.setVote(0)
      await expectRevert(setVotePromise, SET_VOTE_REVERT)
    });

    it("should revert when calling endProposalsRegistering", async () => {
      const endProposalsRegisteringPromise = votingInstance.endProposalsRegistering()
      await expectRevert(endProposalsRegisteringPromise, END_PROPOSAL_REGISTERING_REVERT)
    });

    it("should revert when calling startVotingSession", async () => {
      const startVotingSessionPromise = votingInstance.startVotingSession()
      await expectRevert(startVotingSessionPromise, START_VOTING_REVERT)
    });

    it("should revert when calling endVotingSession", async () => {
      const endVotingSessionPromise = votingInstance.endVotingSession()
      await expectRevert(endVotingSessionPromise, END_VOTING_REVERT)
    });

    it("should revert when calling tallyVotes", async () => {
      const tallyVotesPromise = votingInstance.tallyVotes()
      await expectRevert(tallyVotesPromise, TALLY_VOTE_REVERT)
    });
  });

  describe.only("RegisteringVoters", () => {
    before(async () => {
      votingInstance = await Voting.new({ from: owner });
      await votingInstance.addVoter(owner)
    });

    it("should prevent adding voter if not owner", async () => {
      const addVoterPromise = votingInstance.addVoter(account2, { from: account2 })
      await expectRevert(addVoterPromise, ONLY_OWNER_REVERT)
    });

    it("should prevent adding a voter already added", async () => {
      const addVoterPromise = votingInstance.addVoter(owner)
      await expectRevert(addVoterPromise, ALREADY_REGISTERED_REVERT)
    });

    it("should add a voter in the voters", async () => {
      const voter = await votingInstance.getVoter(account2)
      expect(voter.isRegistered).to.be.false
      await votingInstance.addVoter(account2)
      const newVoter = await votingInstance.getVoter(account2)
      expect(newVoter.isRegistered).to.be.true
    });

    it("should emit an event when adding a voter", async () => {
      const expectedEvent = "VoterRegistered"
      const event = await votingInstance.addVoter(account3)
      expectEvent(event, expectedEvent, { voterAddress: account3 })
    });
  });

  describe("ProposalsRegistrationStarted", () => {
    before(async () => {
      votingInstance = await Voting.new({ from: owner });
      // TODO change state here!
    });

    it('should change the status for ProposalsRegistrationStarted', async () => {

    })

    it("should prevent adding voters", async () => {
    });

    it("should revert the setVote call", async () => {
    });

    it("should revert when calling startProposalsRegistering", async () => {
    });

    it("should revert when calling startVotingSession", async () => {
    });

    it("should revert when calling endVotingSession", async () => {
    });

    it("should revert when calling tallyVotes", async () => {
    });

    it("should prevent adding a proposal if the caller is not a voter", async () => {
    });

    it("should prevent adding an empty proposal", async () => {
    });

    it("should add the proposal in the proposalsArray array", async () => {
    });

    it("should emit an event when adding a proposal", async () => {
    });

    it("should increase the proposalsArray size properly", async () => {
    });
  });

  describe("ProposalsRegistrationEnded", () => {
    before(async () => {
      votingInstance = await Voting.new({ from: owner });
      // TODO change state here!
    });

    it('should change the status for ProposalsRegistrationEnded', async () => {
    })

    it("should prevent adding voters", async () => {
    });

    it("should prevent adding proposals", async () => {
    });

    it("should prevent to set the vote", async () => {
    });

    it("should changing statuts for startProposalsRegistering", async () => {
    });

    it("should revert when calling endProposalsRegistering", async () => {
    });

    it("should revert when calling endVotingSession", async () => {
    });

    it("should revert when calling tallyVotes", async () => {
    });
  });

  describe("VotingSessionStarted", () => {
    before(async () => {
      votingInstance = await Voting.new({ from: owner });
      // TODO change state here!
    });

    it('should change the status for VotingSessionStarted', async () => {
    })

    it("should prevent adding voters", async () => {
    });

    it("should prevent adding proposals", async () => {
    });

    it("should changing statut for startProposalsRegistering", async () => {
    });

    it("should revert when calling endProposalsRegistering", async () => {
    });

    it("should revert when calling startVotingSession", async () => {
    });

    it("should revert when calling endVotingSession", async () => {
    });

    it("should revert when calling tallyVotes", async () => {
    });

    it("should revert if the sender has already voted", () => {

    })

    it("should revert if the proposal if does not exist", () => {

    })

    it("should update the voter properly when voting", () => {

    })

    it("should update the vote count in the array proposalsArray", () => {

    })

    it("should emit an event when setting vote", () => {

    })
  });

  describe("VotingSessionEnded", () => {
    before(async () => {
      votingInstance = await Voting.new({ from: owner });
      // TODO change state here!
    });

    it('should change the status for VotingSessionEnded', async () => {
    })

    it("should prevent adding voters", async () => {
    });

    it("should prevent adding proposals", async () => {
    });

    it("should prevent setting vote", async () => {
    });

    it("should prevent changing statut for startProposalsRegistering", async () => {
    });

    it("should prevent changing statut for endProposalsRegistering", async () => {
    });

    it("should prevent changing statut for startVotingSession", async () => {
    });

    it("should prevent changing statut for endVotingSession", async () => {
    });

    it("should prevent tallying votes", async () => {
    });
  });

  describe("VotesTallied", () => {
    before(async () => {
      votingInstance = await Voting.new({ from: owner });
      // TODO change state here!
    });

    it('should change the status for VotesTallied', async () => {
    })

    it("should prevent adding voters", async () => {
    });

    it("should prevent adding proposals", async () => {
    });

    it("should prevent setting vote", async () => {
    });

    it("should prevent changing statut for startProposalsRegistering", async () => {
    });

    it("should prevent changing statut for endProposalsRegistering", async () => {
    });

    it("should prevent changing statut for startVotingSession", async () => {
    });

    it("should prevent changing statut for endVotingSession", async () => {
    });

    it("should should set the winningProposalID with the correct value", async () => {
    });

    it("should should emit an event when tallying vote", async () => {
    });
  });


});
