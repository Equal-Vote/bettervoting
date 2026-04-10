import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import CandidateForm from "../Candidates/CandidateForm";
import TextField from "@mui/material/TextField";
import { Box, Button, Checkbox, FormControlLabel, FormHelperText, Stack } from "@mui/material";
import { AddIcon, MinusIcon, TransitionBox } from '../../util';
import useConfirm from '../../ConfirmationDialogProvider';
import { SortableList } from '~/components/DragAndDrop';
import { makeDefaultRace, RaceErrors, useEditRace } from './useEditRace';
import { makeUniqueIDSync, ID_PREFIXES, ID_LENGTHS, NOTA_ID } from '@equal-vote/star-vote-shared/utils/makeID';
import VotingMethodSelector, { VotingMethodSelectorHandle } from './VotingMethodSelector';
import useElection from '~/components/ElectionContextProvider';
import { PrimaryButton, FileDropBox, LinkButton, Tip } from '~/components/styles';
import RaceDialog from './RaceDialog';
import { Candidate } from '@equal-vote/star-vote-shared/domain_model/Candidate';
import { Race as IRace } from '@equal-vote/star-vote-shared/domain_model/Race';
import { getImage, postImage } from '../Candidates/PhotoUtil';

interface RaceFormProps {
    raceIndex?: number,
    styling: 'Wizard' | 'Dialog',
    onConfirm?: (editedRace: IRace) => void | Promise<void>,
    onCancel?: () => void,
    dialogOpen?: boolean,
}

interface TitleAndDescriptionValue {
    description?: string,
    title: string,
}

interface TitleAndDescriptionHandle {
    getValue: () => TitleAndDescriptionValue,
}

interface CandidatesSectionValue {
    candidates: Candidate[],
    enable_write_in?: boolean,
}

type CandidateRowKind = 'candidate' | 'draft' | 'nota';

interface CandidateRowItem {
    id: string,
    initialCandidate: Candidate,
    kind: CandidateRowKind,
}

interface CandidatesSectionHandle {
    getValue: () => CandidatesSectionValue,
}

interface CandidateEditorRowHandle {
    getValue: () => Candidate,
}

interface InnerRaceFormProps {
    candidatesRef: React.RefObject<CandidatesSectionHandle | null>,
    errors: RaceErrors,
    initialRace: IRace,
    onClearError: (field: keyof RaceErrors) => void,
    onSetError: (field: keyof RaceErrors, message: string) => void,
    open?: boolean,
    titleAndDescriptionRef: React.RefObject<TitleAndDescriptionHandle | null>,
    votingMethodRef: React.RefObject<VotingMethodSelectorHandle | null>,
}

export const RACE_FORM_GAP = 2;

export default function RaceForm({
    raceIndex = undefined,
    styling,
    onConfirm = async () => {},
    onCancel = () => {},
    dialogOpen = undefined,
}: RaceFormProps) {
    const { election } = useElection();
    const initialRace = useMemo(() => (
        raceIndex == undefined ? makeDefaultRace() : election.races[raceIndex]
    ), [dialogOpen, election.races, raceIndex]);
    const editRace = useEditRace(
        raceIndex == undefined ? null : election.races[raceIndex],
        raceIndex ?? 0,
        dialogOpen,
    );

    const titleAndDescriptionRef = useRef<TitleAndDescriptionHandle>(null);
    const votingMethodRef = useRef<VotingMethodSelectorHandle>(null);
    const candidatesRef = useRef<CandidatesSectionHandle>(null);

    const clearError = useCallback((field: keyof RaceErrors) => {
        editRace.setErrors((prev) => {
            if ((prev[field] ?? '') === '') {
                return prev;
            }

            return {
                ...prev,
                [field]: '',
            };
        });
    }, [editRace.setErrors]);

    const setError = useCallback((field: keyof RaceErrors, message: string) => {
        editRace.setErrors((prev) => {
            if ((prev[field] ?? '') === message) {
                return prev;
            }

            return {
                ...prev,
                [field]: message,
            };
        });
    }, [editRace.setErrors]);

    const collectRace = useCallback((): IRace => ({
        ...initialRace,
        ...titleAndDescriptionRef.current?.getValue(),
        ...votingMethodRef.current?.getValue(),
        ...candidatesRef.current?.getValue(),
    }), [initialRace]);

    const handleConfirm = useCallback(async () => {
        const editedRace = collectRace();
        if (!editRace.validateRace(editedRace)) {
            return;
        }

        await onConfirm(editedRace);
    }, [collectRace, editRace, onConfirm]);

    return (
        <>
            {styling == 'Dialog' &&
                <RaceDialog
                    onSaveRace={handleConfirm}
                    open={dialogOpen}
                    handleClose={onCancel}
                >
                    <Box sx={{ width: { xs: '250px', sm: '500px' }, padding: 1, minHeight: '500px' }}>
                        <InnerRaceForm
                            candidatesRef={candidatesRef}
                            errors={editRace.errors}
                            initialRace={initialRace}
                            onClearError={clearError}
                            onSetError={setError}
                            open={dialogOpen}
                            titleAndDescriptionRef={titleAndDescriptionRef}
                            votingMethodRef={votingMethodRef}
                        />
                    </Box>
                </RaceDialog>
            }
            {styling == 'Wizard' && <>
                <InnerRaceForm
                    candidatesRef={candidatesRef}
                    errors={editRace.errors}
                    initialRace={initialRace}
                    onClearError={clearError}
                    onSetError={setError}
                    titleAndDescriptionRef={titleAndDescriptionRef}
                    votingMethodRef={votingMethodRef}
                />
                <Box display='flex' flexDirection='row' justifyContent='flex-end' gap={1} sx={{ mt: 3 }}>
                    <PrimaryButton onClick={handleConfirm}>Next</PrimaryButton>
                </Box>
            </>}
        </>
    );
}

const InnerRaceForm = ({
    candidatesRef,
    errors,
    initialRace,
    onClearError,
    onSetError,
    open = true,
    titleAndDescriptionRef,
    votingMethodRef,
}: InnerRaceFormProps) => {
    const { election } = useElection();
    const isDisabled = election.state !== 'draft';

    return <Box display='flex' flexDirection='column' alignItems='stretch' gap={RACE_FORM_GAP} sx={{ textAlign: 'left' }}>
        <TitleAndDescription
            ref={titleAndDescriptionRef}
            initialRace={initialRace}
            isDisabled={isDisabled}
            open={open}
            onClearError={onClearError}
            raceDescriptionError={errors.raceDescription}
            raceTitleError={errors.raceTitle}
        />

        <VotingMethodSelector
            ref={votingMethodRef}
            election={election}
            error={errors.votingMethod}
            initialRace={initialRace}
            isDisabled={isDisabled}
            onClearError={onClearError}
            open={open}
        />

        <CandidatesSection
            ref={candidatesRef}
            error={errors.candidates}
            initialRace={initialRace}
            isDisabled={isDisabled}
            onClearError={onClearError}
            onSetError={onSetError}
            open={open}
        />
    </Box>;
};

interface TitleAndDescriptionProps {
    initialRace: IRace,
    isDisabled: boolean,
    onClearError: (field: keyof RaceErrors) => void,
    open?: boolean,
    raceDescriptionError?: string,
    raceTitleError?: string,
}

const TitleAndDescription = forwardRef<TitleAndDescriptionHandle, TitleAndDescriptionProps>(function TitleAndDescription({
    initialRace,
    isDisabled,
    onClearError,
    open,
    raceDescriptionError = '',
    raceTitleError = '',
}, ref) {
    const { t } = useElection();
    const [title, setTitle] = useState(initialRace.title);
    const [description, setDescription] = useState(initialRace.description ?? '');
    const [showDescription, setShowDescription] = useState(initialRace.description != '');

    useEffect(() => {
        setTitle(initialRace.title);
        setDescription(initialRace.description ?? '');
        setShowDescription(initialRace.description != '');
    }, [initialRace, open]);

    useImperativeHandle(ref, () => ({
        getValue: () => ({
            description,
            title,
        }),
    }), [description, title]);

    return <>
        <Box>
            <TextField
                id='race-title'
                disabled={isDisabled}
                name="title"
                label={t('wizard.title_label')}
                type="text"
                error={raceTitleError !== ''}
                value={title}
                sx={{
                    m: 0,
                    boxShadow: 2,
                }}
                fullWidth
                onChange={(e) => {
                    onClearError('raceTitle');
                    setTitle(e.target.value);
                }}
            />
            <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                {raceTitleError}
            </FormHelperText>
        </Box>

        <Box>
            <Button
                sx={{ textDecoration: 'none', textTransform: 'none', color: 'black', fontSize: '1.125rem', opacity: 0.86 }}
                onClick={() => setShowDescription((current) => !current)}
            >
                {showDescription ? <MinusIcon prefix /> : <AddIcon prefix />} Description (Optional)
            </Button>
            {showDescription && <>
                <TextField
                    id='race-description'
                    name="description"
                    label="Description"
                    disabled={isDisabled}
                    multiline
                    fullWidth
                    type="text"
                    error={raceDescriptionError !== ''}
                    value={description}
                    minRows={3}
                    sx={{
                        m: 0,
                        boxShadow: 2,
                    }}
                    onChange={(e) => {
                        onClearError('raceDescription');
                        setDescription(e.target.value);
                    }}
                />
                <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                    {raceDescriptionError}
                </FormHelperText>
            </>}
        </Box>
    </>;
});

interface CandidateEditorRowProps {
    canDelete: boolean,
    disabled: boolean,
    index: number,
    item: CandidateRowItem,
    onClearError: () => void,
    onDeleteCommittedRow: (id: string) => void,
    onPromoteDraft: (draftId: string, candidate: Candidate) => void,
    registerInputRef: (id: string, el: HTMLInputElement | null) => void,
    focusNext: (id: string) => void,
    focusPrevious: (id: string) => void,
    setCandidateError: (message: string) => void,
}

const CandidateEditorRow = React.memo(forwardRef<CandidateEditorRowHandle, CandidateEditorRowProps>(function CandidateEditorRow({
    canDelete,
    disabled,
    index,
    item,
    onClearError,
    onDeleteCommittedRow,
    onPromoteDraft,
    registerInputRef,
    focusNext,
    focusPrevious,
    setCandidateError,
}, ref) {
    const confirm = useConfirm();
    const [candidate, setCandidate] = useState(item.initialCandidate);

    useEffect(() => {
        setCandidate(item.initialCandidate);
    }, [item.initialCandidate]);

    useImperativeHandle(ref, () => ({
        getValue: () => candidate,
    }), [candidate]);

    const onEditCandidate = useCallback((nextCandidate: Candidate) => {
        const updatedCandidate = {
            ...candidate,
            ...nextCandidate,
            candidate_id: item.id,
        };

        setCandidate(updatedCandidate);
        onClearError();

        if (item.kind === 'draft' && candidate.candidate_name === '' && updatedCandidate.candidate_name.trim() !== '') {
            onPromoteDraft(item.id, updatedCandidate);
        }
    }, [candidate, item.id, item.kind, onClearError, onPromoteDraft]);

    const onDeleteCandidate = useCallback(async () => {
        if (!canDelete) {
            setCandidateError('At least 2 candidates are required');
            return;
        }

        const confirmed = await confirm({ title: 'Confirm Delete Candidate', message: 'Are you sure?' });
        if (confirmed) {
            onClearError();
            onDeleteCommittedRow(item.id);
        }
    }, [canDelete, confirm, item.id, onClearError, onDeleteCommittedRow, setCandidateError]);

    const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        const target = event.target as HTMLInputElement;

        if (event.key === 'Tab' && event.shiftKey) {
            event.preventDefault();
            focusPrevious(item.id);
            return;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            focusNext(item.id);
            return;
        }

        if (event.key === 'Backspace' && target.value === '' && index > 0 && item.kind === 'candidate') {
            event.preventDefault();
            focusPrevious(item.id);
            if (canDelete) {
                onClearError();
                onDeleteCommittedRow(item.id);
            } else {
                setCandidateError('At least 2 candidates are required');
            }
        }
    }, [canDelete, focusNext, focusPrevious, index, item.id, item.kind, onClearError, onDeleteCommittedRow, setCandidateError]);

    return (
        <CandidateForm
            onEditCandidate={onEditCandidate}
            candidate={candidate}
            index={index}
            onDeleteCandidate={onDeleteCandidate}
            disabled={disabled}
            special={item.kind === 'nota'}
            inputRef={(element) => registerInputRef(item.id, element)}
            onKeyDown={onKeyDown}
            electionState="draft"
        />
    );
}), (prevProps, nextProps) => (
    prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.canDelete === nextProps.canDelete &&
    prevProps.disabled === nextProps.disabled
));

interface CandidatesSectionProps {
    error?: string,
    initialRace: IRace,
    isDisabled: boolean,
    onClearError: (field: keyof RaceErrors) => void,
    onSetError: (field: keyof RaceErrors, message: string) => void,
    open?: boolean,
}

const CandidatesSection = forwardRef<CandidatesSectionHandle, CandidatesSectionProps>(function CandidatesSection({
    error = '',
    initialRace,
    isDisabled,
    onClearError,
    onSetError,
    open,
}, ref) {
    const { election, t } = useElection();
    const isDraft = election.state === 'draft';
    const [candidatesExpanded, setCandidatesExpanded] = useState(initialRace.candidates.length > 0);
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const rowRefs = useRef<Record<string, CandidateEditorRowHandle | null>>({});
    const createItems = useCallback((race: IRace) => {
        const existingIds = new Set(race.candidates.map((candidate) => candidate.candidate_id));
        const draftId = makeUniqueIDSync(
            ID_PREFIXES.CANDIDATE,
            ID_LENGTHS.CANDIDATE,
            (id: string) => existingIds.has(id),
        );

        return [
            ...race.candidates
                .filter((candidate) => candidate.candidate_id !== NOTA_ID)
                .map((candidate) => ({
                    id: candidate.candidate_id,
                    initialCandidate: candidate,
                    kind: 'candidate' as const,
                })),
            {
                id: draftId,
                initialCandidate: {
                    candidate_id: draftId,
                    candidate_name: '',
                },
                kind: 'draft' as const,
            },
            ...race.candidates
                .filter((candidate) => candidate.candidate_id === NOTA_ID)
                .map((candidate) => ({
                    id: candidate.candidate_id,
                    initialCandidate: candidate,
                    kind: 'nota' as const,
                })),
        ];
    }, []);
    const [items, setItems] = useState<CandidateRowItem[]>(() => createItems(initialRace));
    const [enableWriteIn, setEnableWriteIn] = useState(!!initialRace.enable_write_in);
    const renderCountRef = useRef(0);
    renderCountRef.current += 1;
    console.log('[RaceForm] CandidatesSection render', {
        renderCount: renderCountRef.current,
        items: items.map((item) => ({
            id: item.id,
            kind: item.kind,
        })),
        enableWriteIn,
    });

    useEffect(() => {
        setCandidatesExpanded(initialRace.candidates.length > 1);
        setItems(createItems(initialRace));
        setEnableWriteIn(!!initialRace.enable_write_in);
        inputRefs.current = {};
        rowRefs.current = {};
    }, [createItems, initialRace, open]);

    const getCollectedCandidates = useCallback(() => (
        items
            .filter((item) => item.kind !== 'draft')
            .map((item) => rowRefs.current[item.id]?.getValue() ?? item.initialCandidate)
    ), [items]);

    useImperativeHandle(ref, () => ({
        getValue: () => ({
            candidates: getCollectedCandidates(),
            enable_write_in: enableWriteIn,
        }),
    }), [enableWriteIn, getCollectedCandidates]);

    const clearCandidatesError = useCallback(() => {
        onClearError('candidates');
    }, [onClearError]);

    const registerInputRef = useCallback((id: string, element: HTMLInputElement | null) => {
        inputRefs.current[id] = element;
    }, []);

    const registerRowRef = useCallback((id: string, handle: CandidateEditorRowHandle | null) => {
        rowRefs.current[id] = handle;
    }, []);

    const focusRelative = useCallback((id: string, delta: number) => {
        const currentIndex = items.findIndex((item) => item.id === id);
        const targetIndex = currentIndex + delta;
        if (targetIndex >= 0 && targetIndex < items.length) {
            inputRefs.current[items[targetIndex].id]?.focus();
        }
    }, [items]);

    const getDraftIndex = useCallback((candidateItems: CandidateRowItem[]) => (
        candidateItems.findIndex((item) => item.kind === 'draft')
    ), []);

    const getCommittedCandidateCount = useMemo(() => (
        items.filter((item) => item.kind !== 'draft').length
    ), [items]);

    const onPromoteDraft = useCallback((draftId: string, candidate: Candidate) => {
        clearCandidatesError();
        setItems((currentItems) => {
            const nextItems = [...currentItems];
            const currentDraftIndex = nextItems.findIndex((item) => item.id === draftId);
            if (currentDraftIndex === -1) {
                return currentItems;
            }

            const existingIds = new Set(nextItems.map((item) => item.id));
            existingIds.delete(draftId);

            nextItems[currentDraftIndex] = {
                id: draftId,
                initialCandidate: candidate,
                kind: 'candidate',
            };

            const nextDraftId = makeUniqueIDSync(
                ID_PREFIXES.CANDIDATE,
                ID_LENGTHS.CANDIDATE,
                (id: string) => existingIds.has(id),
            );
            nextItems.splice(currentDraftIndex + 1, 0, {
                id: nextDraftId,
                initialCandidate: {
                    candidate_id: nextDraftId,
                    candidate_name: '',
                },
                kind: 'draft',
            });
            return nextItems;
        });
    }, [clearCandidatesError]);

    const onDeleteCommittedRow = useCallback((id: string) => {
        clearCandidatesError();
        setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    }, [clearCandidatesError]);

    const handleChangeCandidates = useCallback((newItems: CandidateRowItem[]) => {
        clearCandidatesError();
        setItems(newItems);
    }, [clearCandidatesError]);

    const handlePhotoDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        clearCandidatesError();

        const names: string[] = [];
        const promises: Array<Promise<{ photo_filename: string }>> = [];

        for (let i = 0; i < e.dataTransfer.files.length; i++) {
            const file = e.dataTransfer.files[i];
            const parts = file.name.split('.');
            parts.pop();
            names.push(parts.join('.'));
            promises.push(getImage(URL.createObjectURL(file)).then((img) => postImage(img)));
        }

        const photos = (await Promise.all(promises)).map((response) => response.photo_filename);

        setItems((currentItems) => {
            const nextItems = [...currentItems];
            const existingIds = new Set(nextItems.map((item) => item.id));
            const draftIndex = getDraftIndex(nextItems);
            const newItems = names.map((candidateName, index) => {
                const newId = makeUniqueIDSync(
                    ID_PREFIXES.CANDIDATE,
                    ID_LENGTHS.CANDIDATE,
                    (id: string) => existingIds.has(id),
                );
                existingIds.add(newId);

                return {
                    id: newId,
                    initialCandidate: {
                        candidate_id: newId,
                        candidate_name: candidateName,
                        photo_filename: photos[index],
                    },
                    kind: 'candidate' as const,
                };
            });

            nextItems.splice(draftIndex, 0, ...newItems);
            return nextItems;
        });
    }, [clearCandidatesError, getDraftIndex]);

    const maxSpecialCandidates = 1;
    const numSpecialCandidates = items.filter((item) => item.kind === 'nota').length;
    const draftIndex = getDraftIndex(items);

    return <FileDropBox onlyShowOnDrag helperText='Add from photo(s)' onDrop={handlePhotoDrop}>
        <Button
            sx={{ mr: "auto", textDecoration: 'none', textTransform: 'none', color: 'black', fontSize: '1.125rem', opacity: 0.86 }}
            onClick={() => setCandidatesExpanded((current) => !current)}
        >
            {candidatesExpanded ? <MinusIcon prefix /> : <AddIcon prefix />} {t('race_form.candidates_title')}
        </Button>
        <FormHelperText error sx={{ pl: 1, pt: 0 }}>
            {error}
        </FormHelperText>

        <Box sx={{
            position: 'relative',
            height: candidatesExpanded ? `${
                items.length * 66 - 11 +
                40 * (maxSpecialCandidates - numSpecialCandidates) +
                58
            }px` : 0,
            transition: 'height 0.5s',
        }}>
            <TransitionBox absolute enabled={candidatesExpanded}>
                <Stack spacing={2}>
                    <SortableList
                        items={items}
                        identifierKey="id"
                        indexIsValid={(index) => index < draftIndex}
                        onChange={handleChangeCandidates}
                        renderItem={(item, index) => (
                            <SortableList.Item id={item.id}>
                                <CandidateEditorRow
                                    key={item.id}
                                    ref={(handle) => registerRowRef(item.id, handle)}
                                    item={item}
                                    index={index}
                                    canDelete={getCommittedCandidateCount > 2}
                                    disabled={isDisabled}
                                    onClearError={clearCandidatesError}
                                    onDeleteCommittedRow={onDeleteCommittedRow}
                                    onPromoteDraft={onPromoteDraft}
                                    registerInputRef={registerInputRef}
                                    focusPrevious={(id) => focusRelative(id, -1)}
                                    focusNext={(id) => focusRelative(id, 1)}
                                    setCandidateError={(message) => onSetError('candidates', message)}
                                />
                            </SortableList.Item>
                        )}
                    />
                    {isDraft && !items.some((item) => item.kind === 'nota') && <Box>
                        <LinkButton
                            onClick={() => setItems((currentItems) => {
                                if (currentItems.some((item) => item.kind === 'nota')) {
                                    return currentItems;
                                }

                                return [...currentItems, {
                                    id: NOTA_ID,
                                    initialCandidate: {
                                        candidate_id: NOTA_ID,
                                        candidate_name: 'None of the Above',
                                    },
                                    kind: 'nota',
                                }];
                            })}
                            sx={{ ml: 1 }}
                        >
                            Add "None of the Above"
                        </LinkButton>
                        <Tip name='nota' />
                    </Box>}
                    <FormControlLabel
                        disabled={isDisabled}
                        control={
                            <Checkbox
                                id="enable-write-in"
                                checked={enableWriteIn}
                                onChange={(e) => {
                                    clearCandidatesError();
                                    setEnableWriteIn(e.target.checked);
                                }}
                            />
                        }
                        label="Allow write-ins"
                        sx={{ pl: 1 }}
                    />
                </Stack>
            </TransitionBox>
        </Box>
    </FileDropBox>;
});
