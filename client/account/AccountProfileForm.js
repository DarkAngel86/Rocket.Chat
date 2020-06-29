import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Field, FieldGroup, TextInput, TextAreaInput, Box, Icon, AnimatedVisibility, PasswordInput, Button } from '@rocket.chat/fuselage';
import { useDebouncedCallback } from '@rocket.chat/fuselage-hooks';

import { useTranslation } from '../contexts/TranslationContext';
import { isEmail } from '../../app/utils/lib/isEmail.js';
import { useToastMessageDispatch } from '../contexts/ToastMessagesContext';
import { useMethod } from '../contexts/ServerContext';
import { getUserEmailAddress } from '../helpers/getUserEmailAddress';
import { UserAvatarEditor } from '../components/basic/avatar/UserAvatarEditor';
import CustomFieldsForm from '../components/CustomFieldsForm';
import UserStatusMenu from '../components/basic/userStatus/UserStatusMenu';

export default function AccountProfileForm({ values, handlers, user, settings, setCanSave, ...props }) {
	const t = useTranslation();
	const dispatchToastMessage = useToastMessageDispatch();

	const checkUsernameAvailability = useMethod('checkUsernameAvailability');
	const getAvatarSuggestions = useMethod('getAvatarSuggestion');
	const sendConfirmationEmail = useMethod('sendConfirmationEmail');

	const [usernameError, setUsernameError] = useState();
	const [avatarSuggestions, setAvatarSuggestions] = useState();

	const {
		allowRealNameChange,
		allowUserStatusMessageChange,
		allowEmailChange,
		allowPasswordChange,
		allowUserAvatarChange,
		canChangeUsername,
		namesRegex,
		requireName,
	} = settings;

	const {
		realname,
		email,
		username,
		password,
		confirmationPassword,
		statusText,
		bio,
		statusType,
		customFields,
	} = values;

	const {
		handleRealname,
		handleEmail,
		handleUsername,
		handlePassword,
		handleConfirmationPassword,
		handleAvatar,
		handleStatusText,
		handleStatusType,
		handleBio,
		handleCustomFields,
	} = handlers;

	const previousEmail = getUserEmailAddress(user);

	const handleSendConfirmationEmail = useCallback(async () => {
		if (email !== previousEmail) {
			return;
		}
		try {
			await sendConfirmationEmail(email);
			dispatchToastMessage({ type: 'success', message: t('Verification_email_sent') });
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	}, [dispatchToastMessage, email, previousEmail, sendConfirmationEmail, t]);

	const passwordError = useMemo(() => (!password || !confirmationPassword || password === confirmationPassword ? undefined : t('Passwords_do_not_match')), [t, password, confirmationPassword]);
	const emailError = useMemo(() => (isEmail(email) ? undefined : 'error-invalid-email-address'), [email]);
	const checkUsername = useDebouncedCallback(async (username) => {
		if (user.username === username) { return setUsernameError(undefined); }
		if (!namesRegex.test(username)) { return setUsernameError(t('error-invalid-username')); }
		const isAvailable = await checkUsernameAvailability(username);
		if (!isAvailable) { return setUsernameError(t('Username_already_exist')); }
		setUsernameError(undefined);
	}, 400, [namesRegex, t, user.username, checkUsernameAvailability, setUsernameError]);

	useEffect(() => {
		const getSuggestions = async () => {
			const suggestions = await getAvatarSuggestions();
			setAvatarSuggestions(suggestions);
		};
		getSuggestions();
	}, [getAvatarSuggestions]);

	useEffect(() => {
		checkUsername(username);
	}, [checkUsername, username]);

	useEffect(() => {
		if (!password) {
			handleConfirmationPassword('');
		}
	}, [password, handleConfirmationPassword]);

	const nameError = useMemo(() => {
		if (user.name === realname) { return undefined; }
		if (!realname && requireName) { return t('Field_required'); }
	}, [realname, requireName, t, user.name]);

	const statusTextError = useMemo(() => (!statusText || statusText.length <= 120 || statusText.length === 0 ? undefined : t('Max_length_is', '120')), [statusText, t]);
	const { emails: [{ verified = false }] } = user;

	const canSave = !![
		!!passwordError,
		!!emailError,
		!!usernameError,
		!!nameError,
		!!statusTextError,
	].filter(Boolean);

	useEffect(() => {
		setCanSave(canSave);
	}, [canSave, setCanSave]);

	return <FieldGroup is='form' onSubmit={useCallback((e) => e.preventDefault(), [])} { ...props }>
		{useMemo(() => <Field>
			<UserAvatarEditor username={username} setAvatarObj={handleAvatar} disabled={!allowUserAvatarChange} suggestions={avatarSuggestions}/>
		</Field>, [username, handleAvatar, allowUserAvatarChange, avatarSuggestions])}
		<Box display='flex' flexDirection='row' justifyContent='space-between'>
			{useMemo(() => <Field mie='x8'>
				<Field.Label flexGrow={0}>{t('Name')}</Field.Label>
				<Field.Row>
					<TextInput error={nameError} disabled={!allowRealNameChange} flexGrow={1} value={realname} onChange={handleRealname}/>
				</Field.Row>
				<Field.Error>
					{nameError}
				</Field.Error>
			</Field>, [t, realname, handleRealname, allowRealNameChange, nameError])}
			{useMemo(() => <Field mis='x8' >
				<Field.Label flexGrow={0}>{t('Username')}</Field.Label>
				<Field.Row>
					<TextInput error={usernameError} disabled={!canChangeUsername} flexGrow={1} value={username} onChange={handleUsername} addon={<Icon name='at' size='x20'/>}/>
				</Field.Row>
				<Field.Error>
					{usernameError}
				</Field.Error>
			</Field>, [t, username, handleUsername, canChangeUsername, usernameError])}
		</Box>
		{useMemo(() => <Field>
			<Field.Label>{t('StatusMessage')}</Field.Label>
			<Field.Row>
				<TextInput error={statusTextError} disabled={!allowUserStatusMessageChange} flexGrow={1} value={statusText} onChange={handleStatusText} addon={<UserStatusMenu margin='neg-x2' onChange={handleStatusType} initialStatus={statusType}/>}/>
			</Field.Row>
			<Field.Error>
				{statusTextError}
			</Field.Error>
		</Field>, [t, statusTextError, allowUserStatusMessageChange, statusText, handleStatusText, handleStatusType, statusType])}
		{useMemo(() => <Field>
			<Field.Label>{t('Bio')}</Field.Label>
			<Field.Row>
				<TextAreaInput rows={3} flexGrow={1} value={bio} onChange={handleBio} addon={<Icon name='edit' size='x20' alignSelf='center'/>}/>
			</Field.Row>
		</Field>, [bio, handleBio, t])}
		<Box display='flex' flexDirection='row' justifyContent='space-between' alignItems='flex-start'>
			<Box display='flex' flexDirection='column' flexGrow={1} flexShrink={0}>
				{useMemo(() => <Field mie='x8' flexGrow={1}>
					<Field.Label>{t('Email')}</Field.Label>
					<Field.Row>
						<TextInput
							flexGrow={1}
							value={email}
							error={emailError}
							onChange={handleEmail}
							addon={
								<Icon name={ verified ? 'circle-check' : 'mail' } size='x20'/>
							}
							disabled={!allowEmailChange}
						/>
					</Field.Row>
					<Field.Error>
						{t(emailError)}
					</Field.Error>
				</Field>, [t, email, handleEmail, verified, allowEmailChange, emailError])}
				{useMemo(() => !verified && <Field>
					<Button disabled={email !== previousEmail} ghost onClick={handleSendConfirmationEmail}>
						{t('Resend_verification_email')}
					</Button>
				</Field>, [verified, t, email, previousEmail, handleSendConfirmationEmail])}
			</Box>
			<Box display='flex' flexDirection='column' flexGrow={1} flexShrink={0} mis='x8'>
				{useMemo(() => <Field flexGrow={1} mbe='x8'>
					<Field.Label>{t('Password')}</Field.Label>
					<Field.Row>
						<PasswordInput disabled={!allowPasswordChange} error={passwordError} flexGrow={1} value={password} onChange={handlePassword} addon={<Icon name='key' size='x20'/>}/>
					</Field.Row>
				</Field>, [t, password, handlePassword, passwordError, allowPasswordChange])}
				{useMemo(() => <AnimatedVisibility visibility={password ? AnimatedVisibility.VISIBLE : AnimatedVisibility.HIDDEN }><Field>
					<Field.Label>{t('Confirm_password')}</Field.Label>
					<Field.Row>
						<PasswordInput error={passwordError} flexGrow={1} value={confirmationPassword} onChange={handleConfirmationPassword} addon={<Icon name='key' size='x20'/>}/>
					</Field.Row>
					<Field.Error>
						{passwordError}
					</Field.Error>
				</Field></AnimatedVisibility>, [t, confirmationPassword, handleConfirmationPassword, password, passwordError])}
			</Box>
		</Box>
		<CustomFieldsForm customFieldsData={customFields} setCustomFieldsData={handleCustomFields}/>
	</FieldGroup>;
}
