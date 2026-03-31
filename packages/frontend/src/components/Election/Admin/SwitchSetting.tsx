import { useState, useEffect } from 'react';
import { Box, FormHelperText, Switch, Typography } from "@mui/material";

interface SwitchSettingProps {
    label: string
    checked: boolean
    onToggle: (newValue: boolean) => Promise<false | void>
    disabled?: boolean
    disabledMessage?: string
}

export default function SwitchSetting({ label, checked, onToggle, disabled, disabledMessage }: SwitchSettingProps) {
    const [localChecked, setLocalChecked] = useState(checked);

    useEffect(() => {
        setLocalChecked(checked);
    }, [checked]);

    const handleChange = async () => {
        const originalValue = localChecked;
        const newValue = !localChecked;
        setLocalChecked(newValue);
        const result = await onToggle(newValue);
        if (result === false) {
            setLocalChecked(originalValue);
        }
    };

    return (
        <>
            <Box display='flex' flexDirection='row' alignItems='center' justifyContent='space-between' sx={{ py: 0.5 }}>
                <Typography component='span'>{label}</Typography>
                <Switch
                    checked={localChecked}
                    onChange={handleChange}
                    disabled={disabled}
                />
            </Box>
            {disabled && disabledMessage && (
                <FormHelperText sx={{ mb: 2, mt: 0, fontStyle: 'italic', textAlign: 'center' }}>
                    {disabledMessage}
                </FormHelperText>
            )}
        </>
    );
}
