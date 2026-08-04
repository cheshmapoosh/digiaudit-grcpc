package com.digiaudit.grcpc.modules.masterdata.shared;

import com.digiaudit.grcpc.GrcpcApiApplication;
import com.digiaudit.grcpc.common.api.ApiErrorResponse;
import com.digiaudit.grcpc.common.api.ApiExceptionHandler;
import com.digiaudit.grcpc.common.exception.BusinessException;
import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CentralProcessLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CreateCentralProcessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CreateCentralSubprocessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.MoveCentralProcessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.application.ProcessService;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataHierarchyGuard;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataErrorCode;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.exception.HierarchyGuardNotConfiguredException;
import com.digiaudit.grcpc.modules.organization.api.dto.CreateOrganizationRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.organization.application.OrganizationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.Banner;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

@SpringBootTest(
        classes = {
                GrcpcApiApplication.class,
                HierarchyGuardOracleAcceptanceTest.AcceptanceConfiguration.class
        },
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
                "app.master-data.hierarchy-lock-timeout-ms=1000",
                "app.minio.enabled=false"
        }
)
@ContextConfiguration(initializers = HierarchyGuardOracleAcceptanceTest.DisposableOracleConfirmationInitializer.class)
@EnabledIfSystemProperty(named = "oracle.acceptance.enabled", matches = "true")
@Execution(ExecutionMode.SAME_THREAD)
@Timeout(value = 2, unit = TimeUnit.MINUTES)
class HierarchyGuardOracleAcceptanceTest {

    private static final UUID ACCEPTANCE_ACTOR_ID = UUID.fromString("7f6c4d95-b4f6-4da8-bb68-a05fc4a38105");
    private static final String PREFIX = "ACPT_HG_"
            + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT)
            + "_";
    private static final Duration LATCH_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration FUTURE_TIMEOUT = Duration.ofSeconds(15);
    private static final Duration BLOCKED_PROBE = Duration.ofMillis(200);

    @Autowired
    private OrganizationService organizationService;

    @Autowired
    private ProcessService processService;

    @Autowired
    private MasterDataHierarchyGuard hierarchyGuard;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ApiExceptionHandler apiExceptionHandler;

    @BeforeEach
    void prepareScenario() {
        cleanupAcceptanceOwnedData();
        assertGuardRegistry();
    }

    @AfterEach
    void restoreRegistryAndCleanAcceptanceData() {
        restoreGuardRow(MasterDataHierarchyKey.ORGANIZATION);
        cleanupAcceptanceOwnedData();
    }

    @Test
    void baselineGuardRegistryAndPhysicalColumnsMatchTheOracleContract() {
        assertGuardRegistry();

        List<GuardColumn> columns = jdbcTemplate.query(
                """
                        select column_name, data_type, data_length, char_used
                          from user_tab_columns
                         where table_name = 'MASTERDATA_HIERARCHY_GUARD'
                         order by column_id
                        """,
                (resultSet, rowNumber) -> new GuardColumn(
                        resultSet.getString("column_name"),
                        resultSet.getString("data_type"),
                        resultSet.getInt("data_length"),
                        resultSet.getString("char_used")
                )
        );

        assertEquals(
                List.of(new GuardColumn("HIERARCHY_KEY", "VARCHAR2", 64, "B")),
                columns,
                "Baseline: Guard table must contain only the approved VARCHAR2(64 BYTE) key"
        );
    }

    @Test
    void organizationLockTimeoutReturnsHierarchyBusyAndPersistsNothing() {
        String code = code("ORG_TIMEOUT");
        DatabaseState before = state(SourceTable.ORGANIZATION, code);

        Throwable failure = runWithHeldGuardUntilFailure(
                "Scenario A",
                MasterDataHierarchyKey.ORGANIZATION,
                () -> organizationService.create(new CreateOrganizationRequest(code, null, null, null))
        );

        ConflictException conflict = assertInstanceOf(ConflictException.class, failure);
        assertEquals(MasterDataErrorCode.HIERARCHY_BUSY.code(), conflict.getErrorCode());
        assertSafeError(
                apiExceptionHandler.handleConflict(conflict, Locale.ENGLISH),
                HttpStatus.CONFLICT,
                MasterDataErrorCode.HIERARCHY_BUSY.code()
        );
        assertStateUnchanged("Scenario A", before, state(SourceTable.ORGANIZATION, code));
    }

    @Test
    void processAndSubprocessStructuralCreatesShareTheProcessGuard() {
        MasterDataRevisionMutationResponse owner = processService.createProcess(processRequest(code("OWNER"), null));

        String subprocessCode = code("SUB_TIMEOUT");
        DatabaseState beforeSubprocess = state(SourceTable.SUBPROCESS, subprocessCode);
        Throwable subprocessFailure = runWithHeldGuardUntilFailure(
                "Scenario B subprocess",
                MasterDataHierarchyKey.PROCESS,
                () -> processService.createSubprocess(subprocessRequest(subprocessCode, owner.entityId()))
        );
        assertHierarchyBusy(subprocessFailure);
        assertStateUnchanged(
                "Scenario B subprocess",
                beforeSubprocess,
                state(SourceTable.SUBPROCESS, subprocessCode)
        );

        String processCode = code("PROC_TIMEOUT");
        DatabaseState beforeProcess = state(SourceTable.PROCESS, processCode);
        Throwable processFailure = runWithHeldGuardUntilFailure(
                "Scenario B process",
                MasterDataHierarchyKey.PROCESS,
                () -> processService.createProcess(processRequest(processCode, null))
        );
        assertHierarchyBusy(processFailure);
        assertStateUnchanged("Scenario B process", beforeProcess, state(SourceTable.PROCESS, processCode));
    }

    @Test
    void organizationGuardDoesNotBlockProcessMutationOrOrganizationRead() {
        String processCode = code("INDEPENDENT");
        DatabaseState before = state(SourceTable.PROCESS, processCode);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch guardAcquired = new CountDownLatch(1);
        CountDownLatch releaseGuard = new CountDownLatch(1);
        Future<Void> holder = null;
        try {
            holder = holdGuard(
                    executor,
                    transactionManager,
                    hierarchyGuard,
                    MasterDataHierarchyKey.ORGANIZATION,
                    guardAcquired,
                    releaseGuard
            );
            awaitLatch("Scenario C ORGANIZATION Guard acquisition", guardAcquired);

            Future<MasterDataRevisionMutationResponse> processMutation = executor.submit(() ->
                    requiresNew(() -> processService.createProcess(processRequest(processCode, null))));
            MasterDataRevisionMutationResponse response = awaitFuture(
                    "Scenario C Process create while ORGANIZATION is held",
                    processMutation
            );
            assertTrue(response.entityId() != null && response.revisionId() != null);

            Future<Integer> organizationRead = executor.submit(() -> organizationService.findAll(null).size());
            assertTrue(
                    awaitFuture("Scenario C normal Organization read", organizationRead) >= 0,
                    "Scenario C: normal Organization read must remain available while its Guard is held"
            );

            DatabaseState after = state(SourceTable.PROCESS, processCode);
            assertEquals(1, after.sourceRows() - before.sourceRows(), "Scenario C: Process source delta");
            assertEquals(1, after.revisionHeaders() - before.revisionHeaders(), "Scenario C: Revision header delta");
            assertEquals(1, after.revisionContents() - before.revisionContents(), "Scenario C: Revision Content delta");
        } finally {
            releaseGuard.countDown();
            if (holder != null) {
                awaitFuture("Scenario C Guard holder completion", holder);
            }
            shutdownExecutor(executor);
        }
    }

    @Test
    void missingOrganizationGuardFailsClosedAndIsNotRecreated() {
        String code = code("MISSING_GUARD");
        requiresNew(() -> {
            assertEquals(
                    1,
                    jdbcTemplate.update(
                            "delete from masterdata_hierarchy_guard where hierarchy_key = ?",
                            MasterDataHierarchyKey.ORGANIZATION.name()
                    ),
                    "Scenario D: test must delete exactly the ORGANIZATION Guard row"
            );
            return null;
        });

        DatabaseState before = state(SourceTable.ORGANIZATION, code);
        try {
            Throwable failure = captureFailure(() ->
                    requiresNew(() -> organizationService.create(new CreateOrganizationRequest(code, null, null, null))));
            HierarchyGuardNotConfiguredException missing = assertInstanceOf(
                    HierarchyGuardNotConfiguredException.class,
                    failure
            );
            assertEquals(MasterDataErrorCode.HIERARCHY_GUARD_NOT_CONFIGURED.code(), missing.getErrorCode());
            assertEquals(0, countGuard(MasterDataHierarchyKey.ORGANIZATION));
            assertSafeError(
                    apiExceptionHandler.handleHierarchyGuardNotConfigured(missing, Locale.ENGLISH),
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    MasterDataErrorCode.HIERARCHY_GUARD_NOT_CONFIGURED.code()
            );
            assertStateUnchanged("Scenario D", before, state(SourceTable.ORGANIZATION, code));
        } finally {
            restoreGuardRow(MasterDataHierarchyKey.ORGANIZATION);
        }
        assertEquals(1, countGuard(MasterDataHierarchyKey.ORGANIZATION));
    }

    @Test
    void parentDeleteSerializesAgainstChildCreateWithoutCreatingAnOrphan() {
        String parentCode = code("ORG_PARENT");
        String childCode = code("ORG_CHILD");
        MasterDataRevisionMutationResponse parent = organizationService.create(
                new CreateOrganizationRequest(parentCode, null, null, null)
        );
        DatabaseState before = state(SourceTable.ORGANIZATION, childCode);

        BlockedMutationOutcome<MasterDataRevisionMutationResponse> outcome = runBlockedMutationScenario(
                "Scenario E",
                () -> organizationService.delete(
                        parent.entityId(),
                        new OrganizationLifecycleCommandRequest(parent.version())
                ),
                () -> organizationService.create(
                        new CreateOrganizationRequest(childCode, parent.entityId(), null, null)
                )
        );

        NotFoundException rejectedChild = assertInstanceOf(NotFoundException.class, outcome.transactionBFailure());
        assertEquals("PARENT_ORGANIZATION_NOT_FOUND", rejectedChild.getErrorCode());
        assertEquals("DELETED", statusByCode("organization", parentCode));
        assertEquals(0, countCodeRows(SourceTable.ORGANIZATION, childCode));
        assertEquals(0, countAcceptanceOrganizationOrphans());
        DatabaseState after = state(SourceTable.ORGANIZATION, childCode);
        assertEquals(0, after.sourceRows() - before.sourceRows(), "Scenario E: rejected child source delta");
        assertEquals(1, after.revisionHeaders() - before.revisionHeaders(), "Scenario E: only delete Revision persists");
        assertEquals(1, after.revisionContents() - before.revisionContents(), "Scenario E: only delete content persists");
    }

    @Test
    void processDeleteSerializesAgainstSubprocessCreateWithoutCreatingAnOrphan() {
        String processCode = code("PROC_DELETE");
        String subprocessCode = code("SUB_REJECTED");
        MasterDataRevisionMutationResponse process = processService.createProcess(processRequest(processCode, null));
        DatabaseState before = state(SourceTable.SUBPROCESS, subprocessCode);

        BlockedMutationOutcome<MasterDataRevisionMutationResponse> outcome = runBlockedMutationScenario(
                "Scenario F",
                () -> processService.deleteProcess(
                        process.entityId(),
                        new CentralProcessLifecycleCommandRequest(process.version())
                ),
                () -> processService.createSubprocess(subprocessRequest(subprocessCode, process.entityId()))
        );

        NotFoundException rejectedSubprocess = assertInstanceOf(NotFoundException.class, outcome.transactionBFailure());
        assertEquals("PROCESS_FOR_SUBPROCESS_NOT_FOUND", rejectedSubprocess.getErrorCode());
        assertEquals("DELETED", statusByCode("central_process", processCode));
        assertEquals(0, countCodeRows(SourceTable.SUBPROCESS, subprocessCode));
        assertEquals(0, countAcceptanceSubprocessOrphans());
        DatabaseState after = state(SourceTable.SUBPROCESS, subprocessCode);
        assertEquals(0, after.sourceRows() - before.sourceRows(), "Scenario F: rejected Subprocess source delta");
        assertEquals(1, after.revisionHeaders() - before.revisionHeaders(), "Scenario F: only Process delete Revision persists");
        assertEquals(1, after.revisionContents() - before.revisionContents(), "Scenario F: only Process delete content persists");
    }

    @Test
    void opposingProcessMovesSerializeAndCannotCommitACycle() {
        String processACode = code("MOVE_A");
        String processBCode = code("MOVE_B");
        MasterDataRevisionMutationResponse processA = processService.createProcess(processRequest(processACode, null));
        MasterDataRevisionMutationResponse processB = processService.createProcess(processRequest(processBCode, null));
        DatabaseState before = state(SourceTable.PROCESS, processACode);

        BlockedMutationOutcome<MasterDataRevisionMutationResponse> outcome = runBlockedMutationScenario(
                "Scenario G",
                () -> processService.moveProcess(
                        processA.entityId(),
                        new MoveCentralProcessRequest(processB.entityId(), processA.version())
                ),
                () -> processService.moveProcess(
                        processB.entityId(),
                        new MoveCentralProcessRequest(processA.entityId(), processB.version())
                )
        );

        UnprocessableEntityException cycle = assertInstanceOf(
                UnprocessableEntityException.class,
                outcome.transactionBFailure()
        );
        assertEquals("HIERARCHY_CYCLE", cycle.getErrorCode());
        assertSafeError(
                apiExceptionHandler.handleUnprocessableEntity(cycle, Locale.ENGLISH),
                HttpStatus.UNPROCESSABLE_ENTITY,
                "HIERARCHY_CYCLE"
        );
        assertEquals(uuidHex(processB.entityId()), parentProcessHex(processACode));
        assertNull(parentProcessHex(processBCode), "Scenario G: PROCESS_B must remain a root");
        assertEquals(0, countAcceptanceProcessCycles());
        DatabaseState after = state(SourceTable.PROCESS, processACode);
        assertEquals(0, after.sourceRows() - before.sourceRows(), "Scenario G: existing source-row count is unchanged");
        assertEquals(1, after.revisionHeaders() - before.revisionHeaders(), "Scenario G: only one move Revision persists");
        assertEquals(1, after.revisionContents() - before.revisionContents(), "Scenario G: only one move content persists");
    }

    @Test
    void twoIndependentSpringContextsCoordinateThroughTheOracleProcessGuard() {
        ConfigurableApplicationContext secondContext = null;
        try {
            secondContext = new SpringApplicationBuilder(
                    GrcpcApiApplication.class,
                    AcceptanceConfiguration.class
            )
                    .web(WebApplicationType.NONE)
                    .bannerMode(Banner.Mode.OFF)
                    .run(
                            "--app.master-data.hierarchy-lock-timeout-ms=1000",
                            "--app.minio.enabled=false"
                    );

            MasterDataHierarchyGuard secondGuard = secondContext.getBean(MasterDataHierarchyGuard.class);
            PlatformTransactionManager secondTransactionManager = secondContext.getBean(PlatformTransactionManager.class);
            DatabaseState before = state(SourceTable.PROCESS, code("CTX_NONE"));

            Throwable failure = contendAcrossContexts(
                    MasterDataHierarchyKey.PROCESS,
                    secondTransactionManager,
                    secondGuard
            );
            assertHierarchyBusy(failure);
            assertStateUnchanged(
                    "Scenario H",
                    before,
                    state(SourceTable.PROCESS, code("CTX_NONE"))
            );
        } finally {
            if (secondContext != null) {
                secondContext.close();
            }
        }
    }

    private Throwable runWithHeldGuardUntilFailure(
            String scenario,
            MasterDataHierarchyKey hierarchyKey,
            Supplier<?> transactionB
    ) {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch guardAcquired = new CountDownLatch(1);
        CountDownLatch releaseGuard = new CountDownLatch(1);
        Future<Void> holder = null;
        try {
            holder = holdGuard(
                    executor,
                    transactionManager,
                    hierarchyGuard,
                    hierarchyKey,
                    guardAcquired,
                    releaseGuard
            );
            awaitLatch(scenario + " Guard acquisition", guardAcquired);
            Future<?> contender = executor.submit(() -> requiresNew(transactionB));
            return awaitFailure(scenario + " contending transaction", contender);
        } finally {
            releaseGuard.countDown();
            if (holder != null) {
                awaitFuture(scenario + " Guard holder completion", holder);
            }
            shutdownExecutor(executor);
        }
    }

    private Throwable contendAcrossContexts(
            MasterDataHierarchyKey hierarchyKey,
            PlatformTransactionManager secondTransactionManager,
            MasterDataHierarchyGuard secondGuard
    ) {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch guardAcquired = new CountDownLatch(1);
        CountDownLatch releaseGuard = new CountDownLatch(1);
        Future<Void> holder = null;
        try {
            holder = holdGuard(
                    executor,
                    transactionManager,
                    hierarchyGuard,
                    hierarchyKey,
                    guardAcquired,
                    releaseGuard
            );
            awaitLatch("Scenario H Context A PROCESS Guard acquisition", guardAcquired);
            Future<?> contender = executor.submit(() -> requiresNew(
                    secondTransactionManager,
                    () -> {
                        secondGuard.lock(hierarchyKey);
                        return null;
                    }
            ));
            return awaitFailure("Scenario H Context B PROCESS Guard contention", contender);
        } finally {
            releaseGuard.countDown();
            if (holder != null) {
                awaitFuture("Scenario H Context A Guard holder completion", holder);
            }
            shutdownExecutor(executor);
        }
    }

    private <T> BlockedMutationOutcome<T> runBlockedMutationScenario(
            String scenario,
            Supplier<T> transactionA,
            Supplier<?> transactionB
    ) {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch transactionAMutated = new CountDownLatch(1);
        CountDownLatch releaseTransactionA = new CountDownLatch(1);
        CountDownLatch transactionBStarted = new CountDownLatch(1);
        Future<T> transactionAFuture = null;
        try {
            transactionAFuture = executor.submit(() -> requiresNew(() -> {
                T result = transactionA.get();
                transactionAMutated.countDown();
                awaitLatch(scenario + " Transaction A release", releaseTransactionA);
                return result;
            }));
            awaitLatch(scenario + " Transaction A mutation", transactionAMutated);

            Future<?> transactionBFuture = executor.submit(() -> {
                transactionBStarted.countDown();
                return requiresNew(transactionB);
            });
            awaitLatch(scenario + " Transaction B start", transactionBStarted);
            assertFutureBlocked(scenario, transactionBFuture);

            releaseTransactionA.countDown();
            T transactionAResult = awaitFuture(scenario + " Transaction A commit", transactionAFuture);
            Throwable transactionBFailure = awaitFailure(scenario + " Transaction B rejection", transactionBFuture);
            return new BlockedMutationOutcome<>(transactionAResult, transactionBFailure);
        } finally {
            releaseTransactionA.countDown();
            if (transactionAFuture != null && !transactionAFuture.isDone()) {
                awaitFuture(scenario + " Transaction A finalization", transactionAFuture);
            }
            shutdownExecutor(executor);
        }
    }

    private Future<Void> holdGuard(
            ExecutorService executor,
            PlatformTransactionManager manager,
            MasterDataHierarchyGuard guard,
            MasterDataHierarchyKey hierarchyKey,
            CountDownLatch acquired,
            CountDownLatch release
    ) {
        return executor.submit(() -> requiresNew(manager, () -> {
            guard.lock(hierarchyKey);
            acquired.countDown();
            awaitLatch("Hold " + hierarchyKey + " Guard", release);
            return null;
        }));
    }

    private <T> T requiresNew(Supplier<T> callback) {
        return requiresNew(transactionManager, callback);
    }

    private <T> T requiresNew(PlatformTransactionManager manager, Supplier<T> callback) {
        TransactionTemplate template = new TransactionTemplate(manager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        template.setTimeout((int) FUTURE_TIMEOUT.toSeconds());
        return template.execute(status -> callback.get());
    }

    private void assertFutureBlocked(String scenario, Future<?> future) {
        assertThrows(
                TimeoutException.class,
                () -> future.get(BLOCKED_PROBE.toMillis(), TimeUnit.MILLISECONDS),
                scenario + ": Transaction B must remain blocked while Transaction A holds the Guard"
        );
    }

    private Throwable awaitFailure(String action, Future<?> future) {
        try {
            Object result = future.get(FUTURE_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
            return fail(action + " unexpectedly completed successfully with result " + result);
        } catch (ExecutionException exception) {
            return unwrapAsyncException(exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return fail(action + " was interrupted", exception);
        } catch (TimeoutException exception) {
            return fail(action + " exceeded the bounded deadline", exception);
        }
    }

    private Throwable captureFailure(Runnable action) {
        try {
            action.run();
            return fail("Expected the action to fail");
        } catch (Throwable failure) {
            return failure;
        }
    }

    private Throwable unwrapAsyncException(Throwable failure) {
        Throwable current = failure;
        while ((current instanceof ExecutionException || current instanceof java.util.concurrent.CompletionException)
                && current.getCause() != null) {
            current = current.getCause();
        }
        return current;
    }

    private <T> T awaitFuture(String action, Future<T> future) {
        try {
            return future.get(FUTURE_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
        } catch (ExecutionException exception) {
            Throwable cause = unwrapAsyncException(exception);
            return fail(action + " failed with " + cause.getClass().getName() + ": " + cause.getMessage(), cause);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return fail(action + " was interrupted", exception);
        } catch (TimeoutException exception) {
            return fail(action + " exceeded the bounded deadline", exception);
        }
    }

    private void awaitLatch(String action, CountDownLatch latch) {
        try {
            assertTrue(
                    latch.await(LATCH_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS),
                    action + " exceeded the bounded latch deadline"
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            fail(action + " was interrupted", exception);
        }
    }

    private void shutdownExecutor(ExecutorService executor) {
        executor.shutdownNow();
        try {
            assertTrue(
                    executor.awaitTermination(LATCH_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS),
                    "Acceptance executor did not terminate within the bounded deadline"
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            fail("Interrupted while shutting down acceptance executor", exception);
        }
    }

    private void assertHierarchyBusy(Throwable failure) {
        ConflictException conflict = assertInstanceOf(ConflictException.class, failure);
        assertEquals(MasterDataErrorCode.HIERARCHY_BUSY.code(), conflict.getErrorCode());
    }

    private void assertSafeError(
            ResponseEntity<ApiErrorResponse> response,
            HttpStatus expectedStatus,
            String expectedCode
    ) {
        assertEquals(expectedStatus, response.getStatusCode());
        ApiErrorResponse body = Objects.requireNonNull(response.getBody(), "API error response body is required");
        assertEquals(expectedCode, body.code());
        String exposed = (body.message() + " " + body.developerMessage() + " " + body.details()).toUpperCase(Locale.ROOT);
        assertFalse(exposed.contains("ORA-"), "API error must not expose Oracle errors");
        assertFalse(exposed.contains("JDBC"), "API error must not expose JDBC details");
        assertFalse(exposed.contains("SQL"), "API error must not expose SQL details");
        assertFalse(exposed.contains("STACKTRACE"), "API error must not expose stack traces");
    }

    private void assertGuardRegistry() {
        assertEquals(1, countGuard(MasterDataHierarchyKey.ORGANIZATION));
        assertEquals(1, countGuard(MasterDataHierarchyKey.PROCESS));
        assertEquals(
                0L,
                count("select count(*) from masterdata_hierarchy_guard where hierarchy_key = 'SUBPROCESS'"),
                "Baseline: SUBPROCESS Guard must not exist"
        );
        assertEquals(
                2L,
                count("select count(*) from masterdata_hierarchy_guard"),
                "Baseline: Guard registry must contain exactly ORGANIZATION and PROCESS"
        );
    }

    private int countGuard(MasterDataHierarchyKey hierarchyKey) {
        return Math.toIntExact(count(
                "select count(*) from masterdata_hierarchy_guard where hierarchy_key = ?",
                hierarchyKey.name()
        ));
    }

    private void restoreGuardRow(MasterDataHierarchyKey hierarchyKey) {
        requiresNew(() -> {
            jdbcTemplate.update(
                    """
                            insert into masterdata_hierarchy_guard (hierarchy_key)
                            select ? from dual
                             where not exists (
                                   select 1
                                     from masterdata_hierarchy_guard
                                    where hierarchy_key = ?
                             )
                            """,
                    hierarchyKey.name(),
                    hierarchyKey.name()
            );
            return null;
        });
    }

    private DatabaseState state(SourceTable sourceTable, String code) {
        return new DatabaseState(
                countCodeRows(sourceTable, code),
                count("select count(*) from masterdata_revision"),
                count("select count(*) from masterdata_revision_content")
        );
    }

    private void assertStateUnchanged(String scenario, DatabaseState before, DatabaseState after) {
        assertEquals(before.sourceRows(), after.sourceRows(), scenario + ": source rows changed");
        assertEquals(before.revisionHeaders(), after.revisionHeaders(), scenario + ": Revision headers changed");
        assertEquals(before.revisionContents(), after.revisionContents(), scenario + ": Revision Contents changed");
    }

    private long countCodeRows(SourceTable sourceTable, String code) {
        String sql = switch (sourceTable) {
            case ORGANIZATION -> "select count(*) from organization where code = ?";
            case PROCESS -> "select count(*) from central_process where code = ?";
            case SUBPROCESS -> "select count(*) from central_subprocess where code = ?";
        };
        return count(sql, code);
    }

    private String statusByCode(String tableName, String code) {
        String sql = switch (tableName) {
            case "organization" -> "select status from organization where code = ?";
            case "central_process" -> "select status from central_process where code = ?";
            default -> throw new IllegalArgumentException("Unsupported acceptance source table");
        };
        return jdbcTemplate.queryForObject(sql, String.class, code);
    }

    private String parentProcessHex(String code) {
        return jdbcTemplate.queryForObject(
                "select rawtohex(parent_process_id) from central_process where code = ?",
                String.class,
                code
        );
    }

    private long countAcceptanceOrganizationOrphans() {
        return count(
                """
                        select count(*)
                          from organization child
                          left join organization parent on parent.id = child.parent_organization_id
                         where substr(child.code, 1, ?) = ?
                           and child.parent_organization_id is not null
                           and (parent.id is null or parent.status = 'DELETED')
                        """,
                PREFIX.length(),
                PREFIX
        );
    }

    private long countAcceptanceSubprocessOrphans() {
        return count(
                """
                        select count(*)
                          from central_subprocess child
                          left join central_process owner on owner.id = child.process_id
                         where substr(child.code, 1, ?) = ?
                           and (owner.id is null or owner.status = 'DELETED')
                        """,
                PREFIX.length(),
                PREFIX
        );
    }

    private long countAcceptanceProcessCycles() {
        return count(
                """
                        select count(*)
                          from central_process first_process
                          join central_process second_process
                            on second_process.id = first_process.parent_process_id
                         where substr(first_process.code, 1, ?) = ?
                           and second_process.parent_process_id = first_process.id
                        """,
                PREFIX.length(),
                PREFIX
        );
    }

    private long count(String sql, Object... arguments) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class, arguments);
        return Objects.requireNonNull(value, "Oracle count query returned null");
    }

    private void cleanupAcceptanceOwnedData() {
        requiresNew(() -> {
            List<String> revisionIds = jdbcTemplate.queryForList(
                    """
                            select distinct rawtohex(content.revision_id)
                              from masterdata_revision_content content
                             where content.entity_id in (
                                   select id from organization where substr(code, 1, ?) = ?
                                   union all
                                   select id from central_process where substr(code, 1, ?) = ?
                                   union all
                                   select id from central_subprocess where substr(code, 1, ?) = ?
                             )
                            """,
                    String.class,
                    PREFIX.length(), PREFIX,
                    PREFIX.length(), PREFIX,
                    PREFIX.length(), PREFIX
            );
            for (String revisionId : revisionIds) {
                jdbcTemplate.update(
                        "delete from masterdata_revision_content where revision_id = hextoraw(?)",
                        revisionId
                );
            }
            for (String revisionId : revisionIds) {
                jdbcTemplate.update("delete from masterdata_revision where id = hextoraw(?)", revisionId);
            }

            jdbcTemplate.update(
                    "delete from central_subprocess where substr(code, 1, ?) = ?",
                    PREFIX.length(), PREFIX
            );
            jdbcTemplate.update(
                    "update central_process set parent_process_id = null where substr(code, 1, ?) = ?",
                    PREFIX.length(), PREFIX
            );
            jdbcTemplate.update(
                    "delete from central_process where substr(code, 1, ?) = ?",
                    PREFIX.length(), PREFIX
            );
            jdbcTemplate.update(
                    "update organization set parent_organization_id = null where substr(code, 1, ?) = ?",
                    PREFIX.length(), PREFIX
            );
            jdbcTemplate.update(
                    "delete from organization where substr(code, 1, ?) = ?",
                    PREFIX.length(), PREFIX
            );
            return null;
        });
    }

    private CreateCentralProcessRequest processRequest(String code, UUID parentId) {
        return new CreateCentralProcessRequest(code, code, parentId, null, 0, null, null);
    }

    private CreateCentralSubprocessRequest subprocessRequest(String code, UUID processId) {
        return new CreateCentralSubprocessRequest(code, code, processId, null, 0, null, null);
    }

    private String code(String suffix) {
        return PREFIX + suffix;
    }

    private String uuidHex(UUID value) {
        return value.toString().replace("-", "").toUpperCase(Locale.ROOT);
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableWebSecurity
    public static class AcceptanceConfiguration {
        @Bean
        @Primary
        MasterDataRevisionActorProvider acceptanceActorProvider() {
            return () -> ACCEPTANCE_ACTOR_ID;
        }
    }

    public static class DisposableOracleConfirmationInitializer
            implements ApplicationContextInitializer<ConfigurableApplicationContext> {

        private static final List<String> REQUIRED_ENVIRONMENT_VARIABLES = List.of(
                "DB_URL",
                "DB_USERNAME",
                "DB_PASSWORD",
                "DB_SCHEMA"
        );

        @Override
        public void initialize(ConfigurableApplicationContext applicationContext) {
            if (!Boolean.getBoolean("oracle.acceptance.confirm-disposable")) {
                throw new IllegalStateException(
                        "Oracle acceptance requires -Doracle.acceptance.confirm-disposable=true before context startup"
                );
            }
            for (String variableName : REQUIRED_ENVIRONMENT_VARIABLES) {
                String value = System.getenv(variableName);
                if (value == null || value.isBlank()) {
                    throw new IllegalStateException(
                            "Oracle acceptance requires environment variable " + variableName + " before context startup"
                    );
                }
            }
            String databaseUrl = System.getenv("DB_URL");
            if (!databaseUrl.toLowerCase(Locale.ROOT).startsWith("jdbc:oracle:")) {
                throw new IllegalStateException("Oracle acceptance requires an Oracle DB_URL");
            }
        }
    }

    private enum SourceTable {
        ORGANIZATION,
        PROCESS,
        SUBPROCESS
    }

    private record DatabaseState(long sourceRows, long revisionHeaders, long revisionContents) {
    }

    private record GuardColumn(String name, String dataType, int dataLength, String charUsed) {
    }

    private record BlockedMutationOutcome<T>(T transactionAResult, Throwable transactionBFailure) {
    }
}
