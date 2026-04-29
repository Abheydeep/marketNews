package com.marketnarrative.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class RiskRewardServiceTest {

    private final RiskRewardService riskRewardService = new RiskRewardService();

    @Test
    void calculatesBullishRiskReward() {
        double riskReward = riskRewardService.bullishRiskReward(100.0, 95.0, 110.0);

        assertThat(riskReward).isEqualTo(2.0);
    }

    @Test
    void rejectsInvalidBullishRisk() {
        assertThatThrownBy(() -> riskRewardService.bullishRiskReward(100.0, 101.0, 110.0))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
