package com.acme.platform.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import org.junit.jupiter.api.Test;

class ArchitectureTest {
    static final ArchRule DOMAIN_INDEPENDENCE = noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage("org.springframework..", "jakarta..", "javax..",
                    "org.hibernate..", "java.sql..", "java.net..", "..persistence..", "..web..", "..application..",
                    "com.acme.platform.platform..");
    static final ArchRule APPLICATION_INDEPENDENCE = noClasses().that().resideInAPackage("..application..")
            .should().dependOnClassesThat().resideInAnyPackage("..persistence..", "..web..", "jakarta.persistence..",
                    "org.hibernate..", "java.sql..", "javax.sql..", "org.springframework.data..", "org.springframework.http..");
    static final ArchRule WEB_INDEPENDENCE = noClasses().that().resideInAPackage("..web..")
            .and().resideOutsideOfPackage("com.acme.platform.platform..")
            .should().dependOnClassesThat().resideInAnyPackage("..persistence..", "jakarta.persistence..",
                    "org.hibernate..", "org.springframework.data..", "java.sql..");
    static final ArchRule FEATURE_ENCAPSULATION = com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes()
            .should(new ArchCondition<>("access other features only through their api packages") {
                @Override
                public void check(JavaClass source, ConditionEvents events) {
                    String sourceFeature = feature(source);
                    source.getDirectDependenciesFromSelf().forEach(dependency -> {
                        JavaClass target = dependency.getTargetClass();
                        String targetFeature = feature(target);
                        String apiPackage = "com.acme.platform." + targetFeature + ".api";
                        boolean publicApi = target.getPackageName().equals(apiPackage)
                                || target.getPackageName().startsWith(apiPackage + ".");
                        if (!sourceFeature.isEmpty() && !targetFeature.isEmpty()
                                && !sourceFeature.equals(targetFeature) && !targetFeature.equals("platform") && !publicApi) {
                            events.add(SimpleConditionEvent.violated(source, dependency.getDescription()));
                        }
                    });
                }
            });
    static final ArchRule FEATURE_CYCLES = slices().matching("com.acme.platform.(*)..").should().beFreeOfCycles();

    @Test
    void featureBoundariesKeepBusinessRulesIndependentOfAdapters() {
        var classes = new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.acme.platform");
        DOMAIN_INDEPENDENCE.check(classes);
        APPLICATION_INDEPENDENCE.check(classes);
        WEB_INDEPENDENCE.check(classes);
        FEATURE_ENCAPSULATION.check(classes);
        FEATURE_CYCLES.check(classes);
    }

    private static String feature(JavaClass type) {
        String root = "com.acme.platform.";
        String packageName = type.getPackageName();
        if (!packageName.startsWith(root)) return "";
        String relative = packageName.substring(root.length());
        int separator = relative.indexOf('.');
        return separator < 0 ? relative : relative.substring(0, separator);
    }
}
