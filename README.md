# Smart Contract testing project

## Objective

For this project the version of the [Voting contract](/contracts/Voting.sol) used was provided by Alyra. The objective was to cover all the functionnalities of the contract with unit tests.

## How to use it

These tests are developed to be used with [Truffle](<https://trufflesuite.com/>). You should have Truffle and Ganache installed before launching these tests.

1. Clone this repository
2. Go inside the folder and install all dependencies with npm install
3. Launch Ganache with ganache-cli
4. truffle test --network development

## Organization of the tests

All the tests are in the [Voting.test.js](/test/Voting.test.js). The different parts of the tests are organized with differents *describe* ;
At first, we will test the 2 getters and after that we will follow the normal workflow.
For each state in the workflow, we will make differents checks and verify all actions that are not allowed in this state (see all checks describe) and then we will check the behavior of all authorized functions.

## Coverage

I couldn't do a coverage report because the [solidity-coverage library](https://github.com/sc-forks/solidity-coverage) does currently not support Truffle.
Despite that, i think we have a wide coverage, close to 100%.

## Gas reporter

I do a gas usage report with [the library eth-gas-reporter](<https://github.com/cgewecke/eth-gas-reporter>). Below the results :

| Solc version: 0.8.13+commit.abaa5c0e  | Optimizer enabled: false | Runs: 200 |  Block limit: 6718946 gas | | | |
| ------------- | ------------- | ------------- | ------------- | ------------- | ------------- | ------------- |
| Contract  | Method  | Min | Max | Avg | # calls | eur (avg) |
| Voting  | addProposal  | 59076 | 59136 | 59081 | 48 | - |
| Voting  | addVoter  | - | - | 50220 | 65 | - |
| Voting  | endProposalsRegistering  | - | - | 30599 | 26 | - |
| Voting  | endVotingSession  | - | - | 30533 | 16 | - |
| Voting  | setVote  | 60913 | 78013 | 74593 | 20 | - |
| Voting  | startProposalsRegistering  | - | - | 94840 | 36 | - |
| Voting  | startVotingSession  | - | - | 30554 | 24 | - |
| Voting  | tallyVotes  | 46561 | 66477 | 54221 | 13 | - |
| Voting  | TOTAL  | - | - | 1970027 | 29.3 % of limit | - |
