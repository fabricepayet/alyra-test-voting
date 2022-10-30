const Voting = artifacts.require("./Voting");
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract('Voting', accounts => {
  const owner = accounts[0];
  const account2 = accounts[1];
  const account3 = accounts[2];

  let votingInstance;

  const ONLY_VOTER_REVERT = "You're not a voter"
  const ADD_VOTER_REVERT = "Voters registration is not open yet"
  const ONLY_OWNER_REVERT = "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner."
  const ADD_PROPOSAL_REVERT = "Proposals are not allowed yet"
  const SET_VOTE_REVERT = "Voting session havent started yet"
  const END_PROPOSAL_REGISTERING_REVERT = "Registering proposals havent started yet"
  const START_PROPOSAL_REGISTERING_REVERT = "Registering proposals cant be started now"
  const START_VOTING_REVERT = "Registering proposals phase is not finished"
  const END_VOTING_REVERT = "Voting session havent started yet"
  const TALLY_VOTE_REVERT = "Current status is not voting session ended"
  const ALREADY_REGISTERED_REVERT = "Already registered"
  const EMPTY_PROPOSAL_REVERT = "Vous ne pouvez pas ne rien proposer"
  const ALREADY_VOTED_REVERT = "You have already voted"
  const PROPOSAL_NOT_FOUND_REVERT = "Proposal not found"


  describe("Getters", () => {
    describe("GetVoter", () => {
      before(async () => {
        votingInstance = await Voting.new();
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
        expect(voter.votedProposalId).to.be.bignumber.equal(BN(0));
      });
    });

    describe("getOneProposal", () => {
      before(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.startProposalsRegistering()
      });

      it("should revert if the caller is not a voter", async () => {
        const getOneProposalPromise = votingInstance.getOneProposal.call(0, { from: account2 })
        await expectRevert(getOneProposalPromise, ONLY_VOTER_REVERT)
      });

      it("should return the genesis proposal", async () => {
        const expectedDescription = 'GENESIS'
        const proposal = await votingInstance.getOneProposal.call(0)
        expect(proposal.description).to.be.equal(expectedDescription);
        expect(proposal.voteCount).to.be.bignumber.equal(BN(0));
      });

      it("should return the correct proposal", async () => {
        const descriptionProposal = 'description1'
        await votingInstance.addProposal(descriptionProposal)
        const proposal = await votingInstance.getOneProposal.call(1)
        expect(proposal.description).to.be.equal(descriptionProposal);
        expect(proposal.voteCount).to.be.bignumber.equal(BN(0));
      });

      it("should revert if the array index does not exist", async () => {
        const getOneProposalPromise = votingInstance.getOneProposal.call(2);
        await expectRevert.unspecified(getOneProposalPromise)
      });
    });
  })

  describe("RegisteringVoters", () => {
    before(async () => {
      votingInstance = await Voting.new();
    });
    describe("Check initial state", () => {

      it("should have the RegisteringVoters status", async () => {
        const workflowStatus = await votingInstance.workflowStatus();
        expect(workflowStatus).to.be.bignumber.equal(BN(0));
      });

      it("should have the winningProposalID variable at 0", async () => {
        const winningProposalID = await votingInstance.winningProposalID();
        expect(winningProposalID).to.be.bignumber.equal(BN(0));
      });
    });

    describe("checks", () => {
      before(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
      });

      it("should revert the addProposal call", async () => {
        const addProposalPromise = votingInstance.addProposal('test')
        await expectRevert(addProposalPromise, ADD_PROPOSAL_REVERT)
      });

      it("should prevent setting vote", async () => {
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

    describe("addVoter", () => {
      before(async () => {
        votingInstance = await Voting.new();
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

    describe("startProposalsRegistering", () => {
      before(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
      });

      it('should emit an event', async () => {
        const expectedEvent = 'WorkflowStatusChange'
        const event = await votingInstance.startProposalsRegistering()
        expectEvent(event, expectedEvent, { previousStatus: BN(0), newStatus: BN(1) })
      })
    })
  })

  describe("ProposalsRegistrationStarted", () => {
    describe("checks", () => {
      before(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.startProposalsRegistering()
      });

      it("should prevent adding voters", async () => {
        const addVoterPromise = votingInstance.addVoter(account3)
        await expectRevert(addVoterPromise, ADD_VOTER_REVERT)
      });

      it("should prevent setting vote", async () => {
        const setVotePromise = votingInstance.setVote(0)
        await expectRevert(setVotePromise, SET_VOTE_REVERT)

      });

      it("should revert when calling startProposalsRegistering", async () => {
        const startProposalsRegisteringPromise = votingInstance.startProposalsRegistering()
        await expectRevert(startProposalsRegisteringPromise, START_PROPOSAL_REGISTERING_REVERT)
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

    describe("addProposal", () => {
      beforeEach(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.startProposalsRegistering()
      });

      it("should prevent adding a proposal if the caller is not a voter", async () => {
        const addProposalPromise = votingInstance.addProposal('description', { from: account3 })
        await expectRevert(addProposalPromise, ONLY_VOTER_REVERT)
      });

      it("should prevent adding an empty proposal", async () => {
        const addProposalPromise = votingInstance.addProposal('')
        await expectRevert(addProposalPromise, EMPTY_PROPOSAL_REVERT)
      });

      it("should add the proposal in the proposalsArray array", async () => {
        const proposalDescription = 'my description'
        await votingInstance.addProposal(proposalDescription)
        // The current proposal id is 1 because we have added the GENESIS proposal in the contract
        const proposal = await votingInstance.getOneProposal.call(1)
        await expect(proposal.description).equal(proposalDescription)
      });

      it("should emit an event when adding a proposal", async () => {
        const expectedEvent = "ProposalRegistered"
        const proposalDescription = 'description'
        const event = await votingInstance.addProposal(proposalDescription)
        expectEvent(event, expectedEvent, { proposalId: BN(1) })
      });
    });

    describe("endProposalsRegistering", () => {
      beforeEach(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.startProposalsRegistering()
      });

      it('should emit an event', async () => {
        const expectedEvent = 'WorkflowStatusChange'
        const event = await votingInstance.endProposalsRegistering()
        expectEvent(event, expectedEvent, { previousStatus: BN(1), newStatus: BN(2) })
      })

      it('should create a genesis proposal', async () => {
        const expectedDescription = "GENESIS"
        await votingInstance.endProposalsRegistering()
        const proposal = await votingInstance.getOneProposal.call(0);
        expect(proposal.description).to.be.equal(expectedDescription)
      })
    })
  })

  describe("ProposalsRegistrationEnded", () => {
    describe("checks", () => {
      before(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.startProposalsRegistering();
        await votingInstance.addProposal('proposal1')
        await votingInstance.addProposal('proposal2')
        await votingInstance.addProposal('proposal3')
        await votingInstance.endProposalsRegistering();
      });

      it("should prevent adding voters", async () => {
        const addVoterPromise = votingInstance.addVoter(account3)
        await expectRevert(addVoterPromise, ADD_VOTER_REVERT)
      });

      it("should prevent adding proposals", async () => {
        const addProposalPromise = votingInstance.addProposal('test')
        await expectRevert(addProposalPromise, ADD_PROPOSAL_REVERT)
      });

      it("should prevent setting vote", async () => {
        const setVotePromise = votingInstance.setVote(0)
        await expectRevert(setVotePromise, SET_VOTE_REVERT)
      });

      it("should revert when calling endProposalsRegistering", async () => {
        const endProposalsRegisteringPromise = votingInstance.endProposalsRegistering()
        await expectRevert(endProposalsRegisteringPromise, END_PROPOSAL_REGISTERING_REVERT)
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

    describe("startVotingSession", () => {
      before(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.startProposalsRegistering();
        await votingInstance.addProposal('proposal1')
        await votingInstance.addProposal('proposal2')
        await votingInstance.addProposal('proposal3')
        await votingInstance.endProposalsRegistering();
      });

      it('should emit an event', async () => {
        const expectedEvent = 'WorkflowStatusChange'
        const event = await votingInstance.startVotingSession()
        expectEvent(event, expectedEvent, { previousStatus: BN(2), newStatus: BN(3) })
      })
    })
  })

  describe("VotingSessionStarted", () => {
    describe("checks", () => {
      before(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.startProposalsRegistering();
        await votingInstance.addProposal('proposal1')
        await votingInstance.addProposal('proposal2')
        await votingInstance.addProposal('proposal3')
        await votingInstance.endProposalsRegistering();
        await votingInstance.startVotingSession();
      });

      it("should prevent adding voters", async () => {
        const addVoterPromise = votingInstance.addVoter(account3)
        await expectRevert(addVoterPromise, ADD_VOTER_REVERT)
      });

      it("should prevent adding proposals", async () => {
        const addProposalPromise = votingInstance.addProposal('test')
        await expectRevert(addProposalPromise, ADD_PROPOSAL_REVERT)
      });

      it("should revert when calling endProposalsRegistering", async () => {
        const endProposalsRegisteringPromise = votingInstance.endProposalsRegistering()
        await expectRevert(endProposalsRegisteringPromise, END_PROPOSAL_REGISTERING_REVERT)
      });

      it("should revert when calling startVotingSession", async () => {
        const startVotingSessionPromise = votingInstance.startVotingSession()
        await expectRevert(startVotingSessionPromise, START_VOTING_REVERT)
      });

      it("should revert when calling tallyVotes", async () => {
        const tallyVotesPromise = votingInstance.tallyVotes()
        await expectRevert(tallyVotesPromise, TALLY_VOTE_REVERT)
      });
    });

    describe("setVote", () => {
      beforeEach(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.startProposalsRegistering();
        await votingInstance.addProposal('proposal1')
        await votingInstance.addProposal('proposal2')
        await votingInstance.addProposal('proposal3')
        await votingInstance.endProposalsRegistering();
        await votingInstance.startVotingSession();
      });

      it("should prevent adding vote if not voters", async () => {
        const setVotePromise = votingInstance.setVote(1, { from: account3 })
        await expectRevert(setVotePromise, ONLY_VOTER_REVERT)
      })

      it("should revert if the sender has already voted", async () => {
        await votingInstance.setVote(1)
        const setVotePromise = votingInstance.setVote(1)
        await expectRevert(setVotePromise, ALREADY_VOTED_REVERT)
      })

      it("should revert if the proposal if does not exist", async () => {
        const setVotePromise = votingInstance.setVote(4)
        await expectRevert.unspecified(setVotePromise)
      })

      it("should update the voter properly when voting", async () => {
        const proposalId = 1;
        const voter = await votingInstance.getVoter(owner)
        expect(voter.hasVoted).to.be.false
        expect(voter.votedProposalId).to.be.bignumber.equal(BN(0))
        await votingInstance.setVote(proposalId)
        const voterUpdated = await votingInstance.getVoter(owner)
        expect(voterUpdated.hasVoted).to.be.true
        expect(voterUpdated.votedProposalId).to.be.bignumber.equal(BN(proposalId))
      })

      it("should update the vote count for the proposal", async () => {
        const proposalId = 1;
        const proposal = await votingInstance.getOneProposal(proposalId)
        expect(proposal.voteCount).to.be.bignumber.equal(BN(0))
        await votingInstance.setVote(proposalId)
        const proposalUpdated = await votingInstance.getOneProposal(proposalId)
        expect(proposalUpdated.voteCount).to.be.bignumber.equal(BN(1))
      })

      it("should revert if proposal does not exist", async () => {
        const proposalId = 4;
        const setVotePromise = votingInstance.setVote(proposalId)
        await expectRevert(setVotePromise, PROPOSAL_NOT_FOUND_REVERT)
      })

      it("should emit an event when setting vote", async () => {
        const expectedEvent = "Voted"
        const proposalId = 1;
        const event = await votingInstance.setVote(proposalId)
        expectEvent(event, expectedEvent, { voter: owner, proposalId: BN(proposalId) })
      })
    });

    describe("endVotingSession", () => {
      before(async () => {
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.startProposalsRegistering();
        await votingInstance.addProposal('proposal1')
        await votingInstance.addProposal('proposal2')
        await votingInstance.addProposal('proposal3')
        await votingInstance.endProposalsRegistering();
        await votingInstance.startVotingSession();
      });

      it('should emit an event', async () => {
        const expectedEvent = 'WorkflowStatusChange'
        const event = await votingInstance.endVotingSession()
        expectEvent(event, expectedEvent, { previousStatus: BN(3), newStatus: BN(4) })
      })
    })
  })

  describe("VotingSessionEnded", () => {
    describe("checks", () => {
      before(async () => {
        votingInstance = await Voting.new();
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.startProposalsRegistering();
        await votingInstance.addProposal('proposal1')
        await votingInstance.addProposal('proposal2')
        await votingInstance.addProposal('proposal3')
        await votingInstance.endProposalsRegistering();
        await votingInstance.startVotingSession();
        await votingInstance.endVotingSession()
      });

      it("should prevent adding voters", async () => {
        const addVoterPromise = votingInstance.addVoter(account3)
        await expectRevert(addVoterPromise, ADD_VOTER_REVERT)
      });

      it("should prevent adding proposals", async () => {
        const addProposalPromise = votingInstance.addProposal('test')
        await expectRevert(addProposalPromise, ADD_PROPOSAL_REVERT)
      });

      it("should prevent setting vote", async () => {
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
    });

    describe("tallyVotes", () => {
      beforeEach(async () => {
        votingInstance = await Voting.new();
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.addVoter(account3)
        await votingInstance.startProposalsRegistering();
        await votingInstance.addProposal('proposal1')
        await votingInstance.addProposal('proposal2')
        await votingInstance.addProposal('proposal3')
        await votingInstance.endProposalsRegistering();
        await votingInstance.startVotingSession();
        await votingInstance.setVote(1, { from: owner });
        await votingInstance.setVote(2, { from: account2 });
        await votingInstance.setVote(2, { from: account3 });
        await votingInstance.endVotingSession()
      });

      it("should revert if not owner", async () => {
        const tallyVotesPromise = votingInstance.tallyVotes({ from: account2 })
        await expectRevert(tallyVotesPromise, ONLY_OWNER_REVERT)
      });

      it("should set the winningProposalID with the correct value", async () => {
        const expectedProposalId = 2;
        await votingInstance.tallyVotes()
        const winningProposalID = await votingInstance.winningProposalID()
        expect(winningProposalID).to.be.bignumber.equal(BN(expectedProposalId))
      });

      it("should emit an event", async () => {
        const expectedEvent = 'WorkflowStatusChange'
        const event = await votingInstance.tallyVotes()
        expectEvent(event, expectedEvent, { previousStatus: BN(4), newStatus: BN(5) })
      });
    });
  })

  describe("VotesTallied", () => {
    describe("checks", () => {
      before(async () => {
        votingInstance = await Voting.new();
        votingInstance = await Voting.new();
        await votingInstance.addVoter(owner)
        await votingInstance.addVoter(account2)
        await votingInstance.startProposalsRegistering();
        await votingInstance.addProposal('proposal1')
        await votingInstance.addProposal('proposal2')
        await votingInstance.addProposal('proposal3')
        await votingInstance.endProposalsRegistering();
        await votingInstance.startVotingSession();
        await votingInstance.endVotingSession()
        await votingInstance.tallyVotes()
      });

      it("should prevent adding voters", async () => {
        const addVoterPromise = votingInstance.addVoter(account3)
        await expectRevert(addVoterPromise, ADD_VOTER_REVERT)
      });

      it("should prevent adding proposals", async () => {
        const addProposalPromise = votingInstance.addProposal('test')
        await expectRevert(addProposalPromise, ADD_PROPOSAL_REVERT)
      });

      it("should prevent setting vote", async () => {
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
  })
});
