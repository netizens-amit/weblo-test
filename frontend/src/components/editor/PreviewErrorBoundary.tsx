/**
 * Preview Error Boundary
 * 
 * Catches React errors in the preview app and displays
 * helpful error messages instead of a blank screen.
 * 
 * This component should be injected into generated apps
 * to gracefully handle runtime errors.
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class PreviewErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Preview Error:', error);
        console.error('Component Stack:', errorInfo.componentStack);

        this.setState({
            error,
            errorInfo,
        });
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    backgroundColor: '#fef2f2',
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{
                        maxWidth: '600px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '32px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #fecaca',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '20px',
                        }}>
                            <span style={{ fontSize: '32px' }}>⚠️</span>
                            <h1 style={{
                                margin: 0,
                                fontSize: '24px',
                                color: '#dc2626',
                                fontWeight: '600',
                            }}>
                                Preview Error
                            </h1>
                        </div>

                        <p style={{
                            color: '#6b7280',
                            marginBottom: '16px',
                            lineHeight: '1.6',
                        }}>
                            The preview encountered an error. This is usually caused by a bug in the generated code.
                        </p>

                        <div style={{
                            backgroundColor: '#fef2f2',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '16px',
                        }}>
                            <code style={{
                                color: '#dc2626',
                                fontSize: '14px',
                                wordBreak: 'break-word',
                            }}>
                                {this.state.error?.message || 'Unknown error'}
                            </code>
                        </div>

                        {this.state.errorInfo && (
                            <details style={{ marginTop: '16px' }}>
                                <summary style={{
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    fontSize: '14px',
                                    marginBottom: '8px',
                                }}>
                                    View error details
                                </summary>
                                <pre style={{
                                    backgroundColor: '#1f2937',
                                    color: '#f9fafb',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    overflow: 'auto',
                                    maxHeight: '200px',
                                }}>
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <div style={{ marginTop: '24px' }}>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                }}
                            >
                                Reload Preview
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default PreviewErrorBoundary;
