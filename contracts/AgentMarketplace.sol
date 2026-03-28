// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IdleToken.sol";

/**
 * @title AgentMarketplace
 * @dev Decentralized P2P marketplace for AI agents to buy, sell, and barter compute.
 *      Features: MON escrow, Compute Credit barter system, and idle IDLE-token farming.
 *      Optimized for Monad's Parallel EVM.
 */
contract AgentMarketplace {
    IdleToken public idleToken;

    enum TaskStatus { Open, Accepted, Completed, Cancelled }

    struct Task {
        uint256 id;
        address poster;
        address worker;
        string  description;
        uint256 reward;       // MON in wei (escrowed)
        uint256 creditReward; // Compute Credits offered
        TaskStatus status;
        uint256 createdAt;
    }

    mapping(uint256 => Task)   public tasks;
    mapping(address => uint256) public computeCredits;
    mapping(address => bool)   public registeredAgents;
    mapping(address => uint256) public lastIdleTime;

    uint256 public taskCounter;

    // --- Demo-friendly constants (short cooldown for 1-min live demo) ---
    uint256 public constant IDLE_REWARD    = 10 ether; // 10 IDLE per farm
    uint256 public constant CREDIT_PER_TASK = 100;
    uint256 public constant IDLE_COOLDOWN  = 30;       // 30 seconds

    // Events
    event TaskPosted(uint256 indexed taskId, address indexed poster, uint256 reward);
    event TaskAccepted(uint256 indexed taskId, address indexed worker);
    event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 reward);
    event IdleFarmed(address indexed agent, uint256 amount);
    event AgentRegistered(address indexed agent);
    event CreditsEarned(address indexed agent, uint256 amount);

    constructor(address _idleToken) {
        idleToken = IdleToken(_idleToken);
    }

    /// @notice Human registers their local agent's wallet address
    function registerAgent(address agentAddress) external {
        registeredAgents[agentAddress] = true;
        emit AgentRegistered(agentAddress);
    }

    /// @notice Post a compute task — locks MON as escrow
    function postTask(string calldata description, uint256 creditReward) external payable {
        require(msg.value > 0, "Must escrow MON");
        taskCounter++;
        tasks[taskCounter] = Task({
            id:           taskCounter,
            poster:       msg.sender,
            worker:       address(0),
            description:  description,
            reward:       msg.value,
            creditReward: creditReward,
            status:       TaskStatus.Open,
            createdAt:    block.timestamp
        });
        emit TaskPosted(taskCounter, msg.sender, msg.value);
    }

    /// @notice Agent picks up an open task
    function acceptTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Not available");
        require(task.poster != msg.sender,       "Own task");
        task.worker = msg.sender;
        task.status = TaskStatus.Accepted;
        emit TaskAccepted(taskId, msg.sender);
    }

    /// @notice Agent completes task — releases escrow + awards Credits
    function completeTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Accepted, "Not accepted");
        require(task.worker == msg.sender,           "Not assigned worker");

        task.status = TaskStatus.Completed;
        uint256 reward = task.reward;
        task.reward = 0;

        computeCredits[msg.sender] += CREDIT_PER_TASK;

        (bool ok,) = payable(msg.sender).call{value: reward}("");
        require(ok, "Transfer failed");

        emit TaskCompleted(taskId, msg.sender, reward);
        emit CreditsEarned(msg.sender, CREDIT_PER_TASK);
    }

    /// @notice Idle fallback — agent earns IDLE tokens when network is quiet
    function farmIdle() external {
        require(
            block.timestamp >= lastIdleTime[msg.sender] + IDLE_COOLDOWN,
            "Cooldown active"
        );
        lastIdleTime[msg.sender] = block.timestamp;
        idleToken.mint(msg.sender, IDLE_REWARD);
        emit IdleFarmed(msg.sender, IDLE_REWARD);
    }

    /// @notice Returns all Open tasks — primary polling endpoint for agents
    function getOpenTasks() external view returns (Task[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= taskCounter; i++) {
            if (tasks[i].status == TaskStatus.Open) count++;
        }
        Task[] memory open = new Task[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= taskCounter; i++) {
            if (tasks[i].status == TaskStatus.Open) open[idx++] = tasks[i];
        }
        return open;
    }

    receive() external payable {}
}
