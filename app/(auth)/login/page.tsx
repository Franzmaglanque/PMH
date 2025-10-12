'use client';

import {
  Paper,
  TextInput,
  PasswordInput,
  Checkbox,
  Button,
  Title,
  Text,
  Container,
  Group,
  Anchor,
  Stack,
} from '@mantine/core';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSchema, LoginInput } from '../../../lib/schemas/auth.schema'
import { showSuccessNotification, showErrorNotification, showWarningNotification } from '@/lib/notifications';


export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include', // IMPORTANT: Allows cookies to be set and sent
        body: JSON.stringify({
          login: values.login,
          password: values.password,
          rememberMe: values.rememberMe, // Send to backend for cookie duration
        }),
      });

      const data = await response.json();

      if (response.ok && data.status) {
        // Cookie is already set by Laravel backend with HttpOnly flag
        // No need for: document.cookie = ...

        // Store token in localStorage for API requests (header: x-account-session-token)
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        // Store user information for UI display
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        showSuccessNotification(
          'Login Success',
          data.message || 'Credentials authenticated'
        );

        // Redirect to dashboard or intended page
        router.push('/batch');
      } else {
        showErrorNotification(
          'Login Failed',
          data.message || 'Incorrect credentials'
        );
        reset({
          login: values.login, // Keep the login they entered
          password: '', // Clear the password
        });
      }
    } catch (error) {
      showErrorNotification(
        'Error',
        'Something went wrong. Please try again.'
      );
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900} style={{ fontSize: '2rem' }}>
        Welcome back!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Do not have an account yet?{' '}
        <Anchor size="sm" component="button">
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            <TextInput
              label="Login"
              // placeholder="you@example.com"
              required
              {...register('login')}
              error={errors.login?.message}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              {...register('password')}
              error={errors.password?.message}
            />

            <Group justify="space-between">
              <Controller
                name="rememberMe"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Remember me"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Anchor component="button" size="sm" type="button">
                Forgot password?
              </Anchor>
            </Group>

            <Button type="submit" fullWidth loading={loading}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}