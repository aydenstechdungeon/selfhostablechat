<script lang="ts">
	import { ChevronDown, ChevronRight, Brain, Sparkles, Lightbulb, Route } from 'lucide-svelte';
	import { uiStore } from '$lib/stores/uiStore';
	import { slide } from 'svelte/transition';
	
	interface ReasoningStep {
		step: number;
		title: string;
		content: string;
		type: 'analysis' | 'deduction' | 'planning' | 'reflection' | 'conclusion';
	}
	
	interface Props {
		reasoning: string | ReasoningStep[];
		model?: string;
		compact?: boolean;
	}
	
	let { reasoning, model, compact = false }: Props = $props();
	
	let isExpanded = $state(false);
	let activeStep = $state<number | null>(null);
	
	const theme = $derived($uiStore.theme);
	
	// Parse reasoning string into steps if needed
	let parsedSteps = $derived(() => {
		if (Array.isArray(reasoning)) return reasoning;
		
		// Try to parse structured reasoning from string
		const steps: ReasoningStep[] = [];
		const lines = reasoning.split('\n').filter(l => l.trim());
		
		let currentStep: Partial<ReasoningStep> = {};
		let stepContent: string[] = [];
		
		lines.forEach((line, index) => {
			// Check for step headers (e.g., "Step 1:", "1.", "Analysis:")
			const stepMatch = line.match(/^(?:Step\s*)?(\d+)[:.)]\s*(.+)/i) ||
				line.match(/^([A-Za-z\s]+)[:\-]\s*(.+)/);
			
			if (stepMatch) {
				// Save previous step if exists
				if (currentStep.step && stepContent.length > 0) {
					steps.push({
						step: currentStep.step,
						title: currentStep.title || 'Analysis',
						content: stepContent.join('\n').trim(),
						type: inferStepType(currentStep.title || '')
					});
				}
				
				currentStep = {
					step: parseInt(stepMatch[1]) || steps.length + 1,
					title: stepMatch[2]?.trim() || 'Analysis'
				};
				stepContent = [];
			} else {
				stepContent.push(line);
			}
		});
		
		// Add final step
		if (currentStep.step && stepContent.length > 0) {
			steps.push({
				step: currentStep.step,
				title: currentStep.title || 'Analysis',
				content: stepContent.join('\n').trim(),
				type: inferStepType(currentStep.title || '')
			});
		}
		
		// If no structured steps found, treat entire content as single step
		if (steps.length === 0 && reasoning.trim()) {
			steps.push({
				step: 1,
				title: 'Reasoning Process',
				content: reasoning.trim(),
				type: 'analysis'
			});
		}
		
		return steps;
	});
	
	function inferStepType(title: string): ReasoningStep['type'] {
		const lower = title.toLowerCase();
		if (lower.includes('conclusion') || lower.includes('final')) return 'conclusion';
		if (lower.includes('plan') || lower.includes('approach')) return 'planning';
		if (lower.includes('reflect') || lower.includes('review')) return 'reflection';
		if (lower.includes('deduc') || lower.includes('infer')) return 'deduction';
		return 'analysis';
	}
	
	function getStepIcon(type: ReasoningStep['type']) {
		switch (type) {
			case 'analysis': return Brain;
			case 'deduction': return Route;
			case 'planning': return Lightbulb;
			case 'reflection': return Sparkles;
			case 'conclusion': return ChevronRight;
		}
	}
	
	function getStepColor(type: ReasoningStep['type']) {
		switch (type) {
			case 'analysis': return '#4299e1';
			case 'deduction': return '#9f7aea';
			case 'planning': return '#f6ad55';
			case 'reflection': return '#48bb78';
			case 'conclusion': return '#38b2ac';
		}
	}
	
	// Theme-based colors
	let bgColor = $derived(theme === 'light' ? '#f3f4f6' : '#1a1f2e');
	let borderColor = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let hoverBg = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
</script>

<div class="reasoning-display" class:compact>
	<!-- Header -->
	<button
		class="reasoning-header w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:translate-x-1"
		style:background-color={bgColor}
		style:border-color={borderColor}
		onclick={() => isExpanded = !isExpanded}
	>
		<div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
			<Brain size={18} class="text-purple-500" />
		</div>
		
		<div class="flex-1 text-left">
			<div class="flex items-center gap-2">
				<span class="font-medium text-sm" style:color={textPrimary}>
					Chain of Thought
				</span>
				<span class="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500">
					{parsedSteps().length} steps
				</span>
			</div>
			{#if model}
				<span class="text-xs" style:color={textSecondary}>{model}</span>
			{/if}
		</div>
		
	<ChevronDown 
		size={18} 
		color={textSecondary}
		class="transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
	/>
	</button>
	
	<!-- Expanded Content -->
	{#if isExpanded}
		<div 
			class="reasoning-content mt-2 space-y-2"
			transition:slide={{ duration: 200 }}
		>
			{#each parsedSteps() as step, index}
				{@const StepIcon = getStepIcon(step.type)}
				{@const stepColor = getStepColor(step.type)}
				
				<div class="reasoning-step rounded-lg border overflow-hidden"
					style:border-color={borderColor}
					class:active={activeStep === index}
				>
					<button
						class="step-header w-full flex items-center gap-3 p-3 transition-colors"
						style:background-color={activeStep === index ? `${stepColor}15` : bgColor}
						onclick={() => activeStep = activeStep === index ? null : index}
					>
						<div class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
							style:background-color={stepColor}
						>
							{step.step}
						</div>
						
						<StepIcon size={14} color={stepColor} />
						
						<span class="flex-1 text-left text-sm font-medium truncate" style:color={textPrimary}>
							{step.title}
						</span>
						
						<span class="text-xs px-2 py-0.5 rounded capitalize"
							style:background-color={`${stepColor}20`}
							style:color={stepColor}
						>
							{step.type}
						</span>
						
						<ChevronRight 
							size={16} 
							color={textSecondary}
							class="transition-transform duration-200 {activeStep === index ? 'rotate-90' : ''}"
						/>
					</button>
					
					{#if activeStep === index}
						<div 
							class="step-content p-3 text-sm leading-relaxed"
							style:background-color={theme === 'light' ? '#ffffff' : '#0f1419'}
							style:color={textPrimary}
							transition:slide={{ duration: 150 }}
						>
							{step.content}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.reasoning-display {
		margin: 0.5rem 0;
	}
	
	.reasoning-display.compact {
		margin: 0.25rem 0;
	}
	
	.reasoning-display.compact .reasoning-header {
		padding: 0.5rem;
	}
	
	.reasoning-header:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	
	.step-header:hover {
		opacity: 0.9;
	}
	
	.step-content {
		white-space: pre-wrap;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>