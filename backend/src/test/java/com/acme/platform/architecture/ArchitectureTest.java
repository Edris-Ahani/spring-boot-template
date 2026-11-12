package com.acme.platform.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

class ArchitectureTest {
    @Test
    void featureBoundariesKeepBusinessRulesIndependentOfAdapters() {
        var classes = new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.acme.platform");
        noClasses().that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage("org.springframework..", "jakarta..", "..persistence..", "..web..", "..application..")
                .check(classes);
        noClasses().that().resideInAPackage("..application..")
                .should().dependOnClassesThat().resideInAnyPackage("..persistence..", "..web..")
                .check(classes);
        noClasses().that().resideInAPackage("..catalog.web..")
                .should().dependOnClassesThat().resideInAPackage("..persistence..")
                .check(classes);
    }
}
