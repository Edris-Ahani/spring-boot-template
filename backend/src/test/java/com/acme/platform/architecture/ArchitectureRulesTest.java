package com.acme.platform.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.Test;

class ArchitectureRulesTest {
    @Test
    void rejectsInfrastructureDependenciesCrossFeatureInternalsAndFeatureCycles() {
        var fixtures = new ClassFileImporter().importPackages("com.acme.platform.fixtureorders", "com.acme.platform.fixturebilling");
        var domain = ArchitectureTest.DOMAIN_INDEPENDENCE.evaluate(fixtures);
        assertThat(domain.hasViolation()).isTrue();
        assertThat(domain.getFailureReport().toString()).contains("java.sql.Connection", "org.hibernate.Session");
        assertThat(ArchitectureTest.WEB_INDEPENDENCE.evaluate(fixtures).hasViolation()).isTrue();
        assertThat(ArchitectureTest.FEATURE_ENCAPSULATION.evaluate(fixtures).hasViolation()).isTrue();
        assertThat(ArchitectureTest.FEATURE_CYCLES.evaluate(fixtures).hasViolation()).isTrue();
    }
}
