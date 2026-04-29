package com.marketnarrative.analysis;

import org.springframework.stereotype.Service;

@Service
public class RiskRewardService {

    public double bullishRiskReward(double entry, double stopLoss, double target) {
        if (entry <= stopLoss) {
            throw new IllegalArgumentException("Bullish entry must be above stop loss");
        }
        return (target - entry) / (entry - stopLoss);
    }
}
